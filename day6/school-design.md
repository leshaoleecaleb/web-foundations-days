# School Database Design

## 1. Tables

**Students:** Stores each student's ID, name and email address. The student ID is the primary key, and each email must be unique. The name and email cannot be empty.

**Courses:** Stores each course's ID and name. The course ID is the primary key, and the course name is required and unique.

**Enrolments:** Connects students to courses. It stores the enrolment ID, the student's ID, the course's ID and the student's grade. The student ID and course ID are foreign keys. Both are required, while the grade can be empty until it is assigned.

## 2. Relationships

Students and enrolments have a one-to-many relationship because one student can have several enrolments, but each enrolment belongs to one student.

Courses and enrolments also have a one-to-many relationship because one course can have many enrolments, but each enrolment refers to one course.

Students and courses have a many-to-many relationship because one student can take several courses, and one course can have several students. The enrolments table is needed as a join table to connect these two tables and store additional information, such as grades. A UNIQUE constraint on student ID and course ID prevents duplicate enrolments.

## 3. Index

I would add an index on `enrolments(course_id)` to help the database find enrolments for a particular course more efficiently. This can improve queries that list students on a course or count students per course. SQLite automatically creates indexes for primary keys and UNIQUE constraints, but an additional index can help with this common lookup.

## 4. SQL or NoSQL?

I would choose SQL for this school system because students, courses and enrolments have clear relationships. A relational database supports primary keys, foreign keys, UNIQUE constraints and structured queries using JOIN and GROUP BY. These features help maintain accurate records and prevent invalid or duplicate enrolments. SQLite is a good choice for this small project because it is lightweight and does not require a separate database server. A NoSQL database could be useful for more flexible or rapidly changing data structures, but it is not necessary for this system.
