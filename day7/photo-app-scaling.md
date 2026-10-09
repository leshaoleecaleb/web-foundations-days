# SnapShare Photo-App Scaling Plan

## 1. Assumptions and Daily Active Users

SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

Assumptions:
- Registered users: 10,000,000.
- 10% of registered users are active daily.
- Each daily active user uploads 1 photo per day.
- Each daily active user views 50 feed pages per day.
- Each original photo is 2 MB.
- Each photo has one 50 KB thumbnail.
- There are 86,400 seconds in a day and 365 days in a year.
- The average load is spread across the day; peak feed traffic is estimated at 5 times the average.
- Photos and thumbnails are retained for one year, with no deletion or compression included in the storage estimate.

**Daily active users (DAU):**

10,000,000 × 10% = **1,000,000 daily active users**

## 2. Traffic and Storage Estimates

### Uploads per second

Daily uploads:

1,000,000 users × 1 photo = 1,000,000 uploads per day

Average uploads per second:

1,000,000 ÷ 86,400 = **11.57 uploads per second**

### Feed views per second

Daily feed views:

1,000,000 users × 50 pages = 50,000,000 feed views per day

Average feed views per second:

50,000,000 ÷ 86,400 = **578.7 feed views per second**

Peak feed views per second:

578.7 × 5 = **2,893.5 feed views per second**

The system should therefore be designed to handle approximately 2,894 feed views per second during peak traffic.

### Photo storage per year

Original photos per year:

1,000,000 × 365 = 365,000,000 photos

Original photo storage:

365,000,000 × 2 MB = 730,000,000 MB = **730 TB per year**

Thumbnail storage:

365,000,000 × 50 KB = 18,250,000,000 KB = **18.25 TB per year**

Total photo and thumbnail storage:

730 TB + 18.25 TB = **748.25 TB per year**

These are decimal storage estimates, excluding database records, backups, replication, and other overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages per day but upload only one photo per day.

The system receives approximately 50 million feed views and 1 million photo uploads daily. Therefore, the architecture should prioritize fast feed delivery, caching, CDN distribution, and database read replicas while still supporting reliable photo uploads.

## 4. Why Photos Should Not Be Stored in the Database

Photos should not be stored directly inside the main database because large binary files consume database space, increase backup and recovery costs, and can slow down database operations.

Instead, original photos and generated thumbnails should be stored in **object storage**, while the database stores photo metadata, ownership, captions, timestamps, and object-storage keys or URLs.

A CDN can then deliver photos and thumbnails efficiently from locations close to users.

## 5. Architecture Diagram

```text
                       USERS
                         |
             +-----------+-----------+
             |                       |
          Uploads                 Feed Views
             |                       |
             +-----------+-----------+
                         |
                  LOAD BALANCER
                         |
                    APP SERVERS
                    /    |     \
                   /     |      \
             CACHE    DATABASE   OBJECT STORAGE
                        |          (Original photos
                  READ REPLICA      and thumbnails)
                        |
                  QUEUE (upload job)
                         |
                       WORKER
                         |
                 OBJECT STORAGE
                 (Save thumbnail)
                         |
                        CDN
                         |
                    USERS VIEW
```

The CDN serves cached photo files to users, while app servers handle requests and coordinate uploads, feeds, and background processing. The queue and worker process thumbnail jobs asynchronously so that uploads do not have to wait for thumbnail generation to finish.

## 6. Components and the Problems They Solve

1. **Load balancer:** Distributes incoming requests across healthy app servers to prevent one server from becoming overloaded.
2. **App servers:** Handle authentication, upload requests, feed generation, and communication with the cache and database.
3. **Cache:** Stores frequently accessed feed data and metadata to reduce repeated database queries and improve response times.
4. **Main database:** Stores structured information such as users, follows, captions, and photo metadata.
5. **Database read replica:** Handles read queries separately from the primary database, reducing read pressure on the primary.
6. **Object storage:** Stores original photos and thumbnails without filling the database with large binary files.
7. **CDN:** Delivers cached photos and thumbnails from geographically distributed servers, reducing latency and load on the origin storage.
8. **Queue:** Holds thumbnail-generation jobs so they can be processed reliably outside the main upload request.
9. **Thumbnail worker:** Processes queued jobs, resizes uploaded photos, and saves the resulting thumbnails to object storage.

## 7. Photo Upload Flow

1. A user selects a photo and submits it through the SnapShare application.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server authenticates the user and validates the file type, size, and upload permissions.
4. The original photo is uploaded to object storage, using a unique object key.
5. The app server saves the photo metadata and storage key in the primary database.
6. The app server adds a thumbnail-generation job to the queue.
7. The upload can now be acknowledged without waiting for the thumbnail worker to finish.
8. A background worker takes the job from the queue, downloads or reads the original photo, and creates a 50 KB thumbnail.
9. The worker saves the thumbnail in object storage and updates the photo metadata if needed.
10. When users view their feeds, app servers retrieve feed metadata from the cache or database and provide photo URLs.
11. The CDN serves the original photos or thumbnails to users, caching files where appropriate.

The system should use retries and idempotent job processing so that temporary failures do not result in missing thumbnails or duplicate processing.

## 8. Trade-Offs

### Trade-off 1: Cache speed versus data freshness

Caching feed data reduces database load and improves response times, but users may temporarily see outdated feeds after a new photo is uploaded or someone is followed or unfollowed. Cache invalidation and short expiration times improve freshness but can increase database traffic.

### Trade-off 2: Database read replicas versus consistency

Read replicas allow more feed queries to be handled without overloading the primary database. However, replication can lag, meaning a newly uploaded photo might not appear immediately in a feed read from a replica. Reading critical, recently updated data from the primary database can improve consistency but increases its workload.

### Trade-off 3: Asynchronous thumbnails versus immediate availability

A queue and worker keep photo uploads responsive and allow thumbnail generation to scale independently. However, thumbnails may not be available immediately if the queue becomes backed up or a worker fails. Retries, monitoring, and a fallback to the original image can improve reliability but add complexity.

### Trade-off 4: CDN performance versus cost and invalidation

A CDN reduces latency and repeated requests to object storage, but it introduces extra costs and cache-invalidation complexity. Long cache lifetimes work well for immutable photo URLs, while frequently changing content may require more careful expiration or invalidation.

## Conclusion

SnapShare has 1 million daily active users, approximately 11.57 photo uploads per second, 578.7 average feed views per second, and a peak of approximately 2,894 feed views per second. It requires about 748.25 TB of new original-photo and thumbnail storage per year under the stated assumptions.

A read-heavy architecture using a load balancer, app servers, caching, a primary database with a read replica, object storage, a queue, a thumbnail worker, and a CDN supports scalable and responsive photo sharing.
