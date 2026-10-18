# TicketHub — Event Ticketing System Design

## 1. Requirements

### 1.1 Functional requirements

TicketHub allows customers to discover events, select seats, pay securely, and access their tickets.

1. **Browse events:** Users can view upcoming concerts, event dates, venues, prices, and availability.
2. **View seats:** Users can see a venue's seat map and identify available, held, and booked seats.
3. **Hold seats:** Logged-in users can temporarily reserve available seats while completing checkout. A hold expires after 10 minutes if payment is not completed.
4. **Purchase tickets:** Users can submit payment through a payment provider and receive confirmation when payment and booking are verified.
5. **View tickets:** Users can view their confirmed orders, ticket details, and booking references.
6. **Manage events:** Authorized administrators can create events, configure seat inventories, and update event information.
7. **Handle failures:** The system must communicate when a seat is unavailable, payment fails, or a hold expires.

### 1.2 Non-functional requirements

| Requirement | Design target |
|---|---|
| Speed | Event pages load within 2 seconds at the 95th percentile under normal load. |
| Seat availability | Seat-map responses take under 1 second at the 95th percentile under normal load. |
| Correctness | A seat must never have two confirmed bookings for the same event. |
| Fairness | Apply a virtual waiting room, a consistent queue order, rate limits, and per-user purchase limits. |
| Reliability | Target 99.9% monthly availability, excluding agreed maintenance. |
| Security | Use authentication, authorization, encrypted connections, and a trusted payment provider. |
| Scalability | Add application servers and workers as demand increases. |
| Recovery | Back up the database and test restoration procedures. |

Fairness also means that users should not be able to jump the queue simply by repeatedly refreshing or sending requests. The queue should issue signed or otherwise validated access tokens and limit the number of simultaneous checkout attempts per user.

The system should favor correctness over accepting a booking when the database or payment status is uncertain. A failed booking attempt is preferable to selling a seat twice.

## 2. Traffic and capacity estimates

### 2.1 Normal-day traffic

Given:
- Registered users: 2,000,000.
- Daily visitors: 50,000.
- Page views per visitor: 10.
- Tickets sold per day: 5,000.

**Daily page views**

50,000 visitors × 10 pages = 500,000 page views/day.

**Average page requests per second**

500,000 ÷ 86,400 seconds ≈ 5.8 requests/second.

Assuming peak browsing is five times the daily average:

5.8 × 5 ≈ 29 requests/second.

**Average ticket sales rate**

5,000 ÷ 86,400 ≈ 0.058 tickets/second, or about one ticket every 17 seconds on average.

These estimates describe averages, not every second of demand. Real traffic varies by time of day and event popularity.

### 2.2 Big-sale traffic

Given:
- 200,000 people attempt to buy tickets.
- 20,000 seats are available.
- The first 10 minutes are the critical sales window.

**Attempt rate**

200,000 ÷ 600 seconds ≈ 333 purchase attempts/second.

**Seat supply**

20,000 ÷ 600 ≈ 33.3 seats sold per second if all seats sell evenly over the 10 minutes.

**Demand-to-supply ratio**

200,000 ÷ 20,000 = 10 people competing for each seat on average.

### 2.3 Comparison

| Metric | Normal day | Big sale |
|---|---:|---:|
| Daily visitors / sale participants | 50,000 | 200,000 in 10 minutes |
| Page views / attempts | 500,000 page views/day | 333 purchase attempts/second |
| Average request or attempt rate | 5.8 page requests/second | 333 purchase attempts/second |
| Available seats or daily sales | 5,000 tickets sold/day | 20,000 seats |
| Main concern | Efficient browsing | Extreme contention and fairness |

The big-sale attempt rate is approximately 57 times the normal average page-request rate. This is a comparison of different types of traffic, so it is an approximate planning indicator rather than an exact comparison of identical requests.

The 333 attempts per second estimate covers purchase attempts, not every page view or API request. If each participant makes several requests, the total incoming request rate could be considerably higher.

## 3. API design

All endpoints use HTTPS. JSON is used for requests and responses. Authenticated endpoints require a valid user session or access token.

| Method and endpoint | Purpose | Expected response |
|---|---|---|
| `GET /api/events` | Browse and search events | `200 OK` |
| `GET /api/events/{eventId}` | View event details | `200 OK` |
| `GET /api/events/{eventId}/seats` | View seats and current availability | `200 OK` |
| `POST /api/events/{eventId}/holds` | Temporarily hold selected seats | `201 Created` |
| `POST /api/orders/{orderId}/payment` | Start payment for an order | `202 Accepted` or appropriate payment response |
| `GET /api/orders/{orderId}` | Check order and payment status | `200 OK` |
| `GET /api/me/tickets` | View the authenticated user's tickets | `200 OK` |

### Example: hold seats

`POST /api/events/123/holds`

Request:

```json
{
  "seatIds": ["A10", "A11"],
  "idempotencyKey": "unique-request-123"
}
```

A successful response returns the hold ID, selected seats, and expiry time. If another customer has already held or purchased a seat, the request returns `409 Conflict`.

The hold endpoint must enforce availability inside the database transaction. Checking availability in a previous, separate request is not sufficient.

### Example: start payment

`POST /api/orders/456/payment`

The server verifies that the authenticated user owns the order and that the hold remains valid before initiating payment. Payment is processed by a trusted payment provider. The client must not be allowed to declare a payment successful by itself.

The system verifies payment through a trusted provider response or webhook before confirming the order. Repeated requests with the same idempotency key must not create duplicate charges or bookings.

## 4. Database design

Use PostgreSQL as the authoritative database because ticket sales require transactions, relationships, and strong data integrity.

### 4.1 Tables

**Users**

| Column | Purpose |
|---|---|
| `user_id` | Primary key |
| `name` | Customer name |
| `email` | Unique email address |
| `password_hash` | Secure password hash |
| `created_at` | Account creation time |

**Events**

| Column | Purpose |
|---|---|
| `event_id` | Primary key |
| `title` | Event name |
| `venue` | Event venue |
| `starts_at` | Event date and time |
| `status` | Draft, on sale, or cancelled |

**Seats**

Each seat record represents one sellable seat for a particular event.

| Column | Purpose |
|---|---|
| `seat_id` | Primary key |
| `event_id` | Foreign key to Events |
| `section` | Seating section |
| `row_label` | Row identifier |
| `seat_number` | Seat identifier |
| `price` | Ticket price |
| `status` | Available, held, or booked |
| `hold_expires_at` | Expiry time for a temporary hold |
| `held_by_user_id` | User currently holding the seat, if any |

A unique constraint on `(event_id, section, row_label, seat_number)` prevents duplicate seat records for the same event.

**Orders**

| Column | Purpose |
|---|---|
| `order_id` | Primary key |
| `user_id` | Foreign key to Users |
| `status` | Pending, confirmed, failed, or cancelled |
| `total_amount` | Total order price |
| `currency` | Currency used for payment |
| `payment_reference` | Provider payment reference |
| `created_at` | Order creation time |

An additional **OrderItems** table connects orders to individual seats.

| Column | Purpose |
|---|---|
| `order_item_id` | Primary key |
| `order_id` | Foreign key to Orders |
| `seat_id` | Foreign key to Seats |
| `price_at_purchase` | Price captured when ordering |

A unique constraint on `(order_id, seat_id)` prevents the same seat from appearing twice within one order.

### 4.2 Relationships

- One user can create many orders.
- One event has many seats.
- One order contains one or more order items.
- Each order item refers to one seat.
- Each seat belongs to one event.

For additional auditability, a production version should include a SeatHolds table containing the hold ID, user ID, event ID, expiry time, and hold status. A Payments table and an outbox table would also support payment reconciliation and reliable downstream ticket issuance.

## 5. Preventing double-booking

This is the most important correctness requirement in TicketHub.

Imagine that two customers click seat A10 at almost exactly the same time. Both might initially see the seat marked as available. The system must not rely on the screen or a simple availability check to decide who wins.

### 5.1 Use a database transaction

When a customer requests a seat hold:

1. Begin a short database transaction.
2. Lock the relevant seat row using `SELECT ... FOR UPDATE`.
3. Check that the seat is available or that any previous hold has expired.
4. Change its status to `held`, assign the user, and set the expiry time.
5. Create the hold record and order information in the same transaction.
6. Commit the transaction.

If another request targets the same seat, it must wait for the first transaction or discover that the seat is no longer available. Only one request succeeds.

Simplified SQL:

```sql
BEGIN;

SELECT seat_id, status, hold_expires_at
FROM seats
WHERE event_id = 123 AND seat_id = 'A10'
FOR UPDATE;

-- Application checks availability and hold expiry.
-- If available, assign the hold to this customer.

UPDATE seats
SET status = 'held',
    held_by_user_id = 42,
    hold_expires_at = NOW() + INTERVAL '10 minutes'
WHERE event_id = 123
  AND seat_id = 'A10';

COMMIT;
```

This is an educational example. The real implementation must verify the seat's state and expiry while holding the row lock, and must update the row only if it is still eligible. The hold record must also be created within the same transaction. For multiple seats, lock them in a consistent order and reserve all of them or none of them.

### 5.2 Add database constraints

The database must enforce the rule even if an application bug or simultaneous request bypasses a preliminary availability check.

- Unique seat identity per event.
- A single active owner for each seat.
- A single confirmed booking for each event-seat combination.
- Valid foreign keys and order references.
- A valid state transition from available to held to booked.

For example, a separate booking table can use a unique constraint on `(event_id, seat_id)` for confirmed bookings, implemented in a way that permits expired holds and legitimate cancellations.

### 5.3 Handle expiry and payment safely

A hold lasts 10 minutes. If checkout is abandoned, the seat becomes eligible for another customer once the hold has expired. Expiry must be checked against the current time; a delayed cleanup task must not be the only thing that makes seats available again.

After payment, the backend checks the payment result and confirms the booking in a transaction. If payment succeeds after the hold has expired and the seat has been reassigned, the system must not confirm a conflicting booking. It should follow a defined refund or payment-reconciliation process.

**The guarantee:** a seat can be temporarily held by one customer or permanently booked by one customer, but it cannot be confirmed for two customers at the same event.

## 6. Architecture diagram

```text
                    CUSTOMERS
                        |
                        v
                [Web / Mobile UI]
                        |
                        v
              [CDN + Load Balancer]
                        |
                        v
               [Virtual Waiting Room]
                        |
                        v
                 [API Servers]
                   /    |     \
                  /     |      \
                 v      v       v
           [Event]  [Seat/Order] [Payment]
           [Service] [Service]  [Service]
              |         |          |
              v         v          v
           [Cache]  [PostgreSQL] [Payment
                       |          Provider]
                       |
                [Transactional Outbox]
                       |
                       v
                [Message Queue]
                   /        \
                  v          v
           [Ticket Worker] [Notification
                  |          Worker]
                  v
           [Ticket Storage]
```

### Component responsibilities

1. **Web/mobile UI:** Lets users browse events, view seats, purchase tickets, and retrieve confirmations.
2. **CDN:** Serves static files, images, and other cacheable content close to customers.
3. **Load balancer:** Distributes requests across healthy API servers.
4. **Virtual waiting room:** Smooths the sudden arrival of 200,000 buyers and issues controlled access to the purchase flow. Queue position should be handled consistently, with anti-bot controls and clear feedback.
5. **API servers:** Validate requests, authenticate users, enforce rate limits, and coordinate services.
6. **Event service:** Provides event details and search results.
7. **Seat/order service:** Manages seat availability, holds, orders, and transactional booking rules.
8. **Cache:** Speeds up frequently read event information. Seat availability shown from a cache is only a display hint; the authoritative booking decision comes from PostgreSQL.
9. **PostgreSQL:** Stores users, events, seats, orders, payments, and booking state with transactions and constraints.
10. **Payment provider:** Processes payments securely and returns trusted payment outcomes.
11. **Transactional outbox and message queue:** Deliver booking events reliably to background workers.
12. **Ticket and notification workers:** Issue tickets and send confirmation messages without making the main purchase request wait for every background task.

### How the architecture survives the big sale

The CDN and cache absorb much of the browsing traffic. The waiting room prevents all 200,000 participants from overwhelming the booking service simultaneously. Horizontally scaled API servers process the admitted traffic, while the transactional database serializes conflicting seat reservations and enforces uniqueness.

The booking service should also use connection pooling, bounded queues, sensible timeouts, retry limits, and monitoring. Payment calls must happen outside long-running database transactions. Background workers handle ticket issuance and notifications.

The waiting room improves stability and fairness, but it cannot create more seats. With 200,000 participants competing for 20,000 seats, many customers must receive a clear sold-out or unavailable response.

## 7. Trade-offs

### Trade-off 1: Strong consistency versus speed

**Choice:** Use PostgreSQL transactions and constraints for seat holds and confirmed bookings.

**Benefit:** Protects seat ownership even when requests arrive simultaneously.

**Cost:** Conflicting requests may wait, and database contention can increase latency during a sale.

**Why this is acceptable:** Selling a seat twice is worse than asking a customer to wait briefly or retry.

### Trade-off 2: Waiting room versus immediate access

**Choice:** Use a virtual waiting room during high-demand sales.

**Benefit:** Controls the rate at which buyers reach the booking service and gives customers a more orderly experience.

**Cost:** Some users must wait before selecting seats, and queue infrastructure adds complexity.

**Why this is acceptable:** Controlled access is safer than allowing an uncontrolled traffic spike to overload the system.

### Trade-off 3: Short holds versus longer holds

**Choice:** Give customers 10 minutes to complete checkout.

**Benefit:** Provides reasonable time to pay and reduces seats being abandoned indefinitely.

**Cost:** A customer who takes too long may lose a seat, while long holds reduce availability for other buyers.

**Why this is acceptable:** A fixed, clearly communicated expiry balances checkout convenience with fair access.

## 8. Conclusion

TicketHub is designed around three priorities: fast event browsing, fair access during popular sales, and correct seat ownership.

Caching, a CDN, horizontal scaling, and a virtual waiting room help handle the big-sale traffic. Database transactions and constraints prevent double-booking, while payment verification and reliable background processing complete the purchase flow.

The most important principle is that availability shown to a customer is not a reservation. Only a successful, authoritative database transaction can establish a hold or confirm a booking.