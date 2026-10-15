**PES UNIVERSITY, BANGALORE**

**SOFTWARE REQUIREMENTS SPECIFICATION**

**for  
HOSTEL MANAGEMENT SYSTEM**

Version 1.1  
Prepared by Neha K S, Raiesh Giriyapanavar (v1.0); revised by Team 3 (v1.1)  
Team 3 — Raiesh Giriyapanavar, Chiranthan Sathrasala, Neha K S, Harsh M  
14 October 2026

Baseline: SRS v1.0 (06 September 2026) is kept unchanged in `docs/baseline/SRS_v1.0.md`. Differences are recorded in `docs/DEVIATIONS.md`.

# Table of Contents

Revision History

Summary of Changes in v1.1

1. Introduction

2. Overall Description

3. External Interface Requirements

4. Analysis Models

5. System Features

6. Other Nonfunctional Requirements

7. Other Requirements

Appendix A: Glossary

Appendix B: Field Layouts

Appendix C: Requirement Traceability Matrix

# Revision History

| **Name** | **Date**    | **Reason For Changes** | **Version** |
|----------|-------------|------------------------|-------------|
| Neha K S | 06-Sep-2026 | Initial draft of SRS   | 1.0         |
| Neha K S | 14-Oct-2026 | Revision for the MERN stack (MongoDB), SAD v1.1 and the approved backlog; see Summary of Changes | 1.1 |

# Summary of Changes in v1.1

| # | Area | Change in v1.1 | Sections |
|---|------|----------------|----------|
| 1 | Technology stack | The relational database is replaced by MongoDB (MERN stack required by the course). The decision is recorded in `docs/ADR-001.md`. | 2.1, 2.4, 2.5, 3.2, 7 |
| 2 | User classes | The System Administrator is removed. Admin accounts are created by the seed script. | 2.3, 4.1 |
| 3 | USN | USN length changes from 10 to 13 alphanumeric characters. | FR-001.1, Appendix B |
| 4 | Room allocation | FR-002.5 (reallocate) and FR-002.6 (vacate with confirmation) are added as numbered requirements. | 5.2, 6.2 |
| 5 | Fees | FR-003.1 now has the admin set the amount due and due date; FR-003.4 (payment validation) is added. | 5.3 |
| 6 | Fee records | Deletion of fee records is removed from the operational controls. | 6.2 |
| 7 | NFRs | NFR-001 is split into NFR-001.a/b and NFR-002 into NFR-002.a/b/c. Students may access only their own records. The "two NFRs" limitation is removed. | 6.1, 6.2 |
| 8 | Data model | The Fee entity holds the due date and a payment list. Eight collections plus a session store. | 4.2 |
| 9 | Traceability | Appendix C is replaced by the matrix from SAD v1.1 with Test Plan v1.1 case IDs. | Appendix C |
| 10 | References and glossary | SAD v1.1, Test Plan v1.1 and the v1.0 baseline are referenced. MERN, MongoDB and ADR are added to the glossary. | 1.4, Appendix A |

# 1. Introduction

## 1.1 Purpose

This document specifies the software requirements for Version 1.0 of the Hostel Management System (HMS), a mini-project developed by Team 3. HMS is intended to replace register- and spreadsheet-based hostel record keeping with a centralized web-based system for managing student details, room allocation, hostel fees, complaints, leave requests, visitor entries, and administrative reports. This SRS covers the complete system.

## 1.2 Intended Audience and Reading Suggestions

This SRS is intended for the project guide/evaluator, development team, testers, hostel wardens/administrators, and students who will use or evaluate the system. Sections 1 and 2 provide an overview; Sections 3–7 define interfaces, functional and nonfunctional requirements; the appendices provide the glossary, field layouts, and traceability matrix.

## 1.3 Product Scope

HMS shall provide students with registration/login, room-status viewing, fee-status viewing, complaint submission, and leave-request facilities. Warden/admin users shall manage room allocation and vacancy, fee records, complaints, leave approvals, visitor entries, and reports. The system aims to reduce paperwork, minimize data-entry errors, and provide a consistent view of hostel records.

## 1.4 References

- IEEE 830 SRS template provided for the course.

- Team 3 project sheet (SE_Mini-Project_Teams).

- Test Plan Details document provided with the SRS template.

- HMS Software Architecture & Design Specification v1.1 (`docs/SAD.md`).

- HMS Test Plan v1.1 (`docs/TEST_PLAN.md`).

- HMS SRS v1.0, the submitted baseline (`docs/baseline/SRS_v1.0.md`).

# 2. Overall Description

## 2.1 Product Perspective

HMS is a new system being developed from scratch to replace manual hostel record keeping. It consists of a web front end, a back-end application server, and a MongoDB document database. The browser communicates with the server using HTTPS, and the application server reads and writes persistent hostel data through the database.

## 2.2 Product Functions

- Student registration and login.

- Room allocation, reallocation, vacating, and vacancy tracking.

- Hostel fee recording and fee-status tracking.

- Complaint submission, tracking, and resolution.

- Leave-request submission and approval/rejection.

- Visitor entry and exit logging.

- Administrative dashboard and exportable reports.

## 

## 2.3 User Classes and Characteristics

| **User Class**       | **Main Functions**                                                                                         | **Characteristics**                             |
|----------------------|------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| Student              | Register/login, view room and fee status, raise complaints, submit leave requests, view complaint history. | Frequent user; basic computer literacy assumed. |
| Warden/Admin         | Allocate/reallocate/vacate rooms, manage fees and complaints, approve leave, log visitors, view reports.   | Privileged operational user.                    |

Warden/Admin accounts are created by a seed script. HMS has no separate System Administrator user class.

## 2.4 Operating Environment

HMS shall operate as a web application on current supported versions of Chrome, Firefox, and Edge on desktop and mobile devices. The application server shall run on the operating system and runtime selected in the Team 3 project setup. The persistent database shall be MongoDB, accessed through Mongoose from a Node.js and Express application server (MERN stack; see `docs/ADR-001.md`).

## 2.5 Design and Implementation Constraints

- The project shall be completed within the mini-project schedule.

- The implementation shall use the MERN stack (MongoDB, Express, React, Node.js) specified for Team 3.

- Source code and project documentation shall be maintained in the team's GitHub repository.

- The system shall run on the available lab/hosting environment.

- The implementation shall use MongoDB and enforce appropriate access control.

## 2.6 Assumptions and Dependencies

- Users have network access when using the web application.

- The hostel office provides correct initial room and student data.

- Students possess a valid college ID/USN.

- The application server and database service are available during operation.

- Any optional notification service depends on availability of the selected email/SMS provider.

# 3. External Interface Requirements

## 3.1 User Interfaces

The system shall provide role-appropriate login and dashboard screens. The student dashboard shall provide profile, room/fee status, complaints, and leave requests. The admin dashboard shall provide room allocation, fee tracking, complaint resolution, leave approval, visitor logging, and reports. Forms shall clearly identify required fields and display understandable validation, success, and error messages.

## 3.2 Software Interfaces

HMS shall use a MongoDB database to store student, room, allocation, fee, complaint, leave, visitor, and user records. The web front end shall communicate with the back end through REST APIs, with structured JSON used for API request and response data.

## 3.3 Communications Interfaces

Browser-to-server communication shall use HTTPS. API communication shall use HTTP methods and JSON payloads. If notifications are implemented, the system may use an external email/SMS service; such integration is outside the mandatory core functionality unless specified by the final project implementation.

# 4. Analysis Models

## 4.1 Use Case Model

The principal actors are Student and Warden/Admin. Student use cases include Register, Login, View Room Status, View Fee Status, Raise Complaint, View Complaint History, and Request Leave. Warden/Admin use cases include Login, Allocate/Reallocate/Vacate Room, Record Fee Payment, Resolve Complaint, Approve/Reject Leave, Log Visitor Entry/Exit, and View/Export Reports.

## 4.2 Entity-Relationship Model

The core data entities are User, Student, Room, Allocation, Fee, Complaint, LeaveRequest, and Visitor (eight MongoDB collections; login sessions are kept in a separate session store). A Student can have room allocation records over time but only one active allocation; a Room belongs to a hostel block and has a capacity; a Fee record holds the amount due, the due date, and a list of payments; Fee and Complaint records reference the relevant Student; LeaveRequest records approval status; Visitor records reference the Student being visited.

Note: The detailed UML use-case diagram and ER diagram should be included in the final submission if the course requires graphical analysis models. The textual model above defines the actors, use cases, entities, and relationships that the diagrams must represent.

# 5. System Features

## 5.1 Student Registration and Login

Requirement ID: FR-001 \| Priority: High  
Description: Allows a student to register with required details and securely authenticate.

### Stimulus/Response Sequences

1.  Student opens registration → enters details → submits → system validates → account is created. Student then enters credentials → system authenticates → dashboard is displayed.

### Functional Requirements

- FR-001.1: The system shall allow a student to register using a 13-character alphanumeric USN (for example PES1UG24CS924), name, email, phone number, and password.

- FR-001.2: The system shall validate that USN and email are unique before creating an account.

- FR-001.3: The system shall authenticate registered students using USN/email and password and temporarily lock the account for 15 minutes after 5 consecutive failed login attempts.

## 5.2 Room Allocation Management

Requirement ID: FR-002 \| Priority: High  
Description: Allows authorized hostel staff to allocate, reallocate, and vacate rooms while maintaining occupancy.

### Stimulus/Response Sequences

2.  Admin selects a student → system displays available rooms → admin selects a room → system checks capacity and active allocation → allocation is saved and occupancy is updated.

### Functional Requirements

- FR-002.1: The system shall display room availability by block, floor, and sharing type.

- FR-002.2: The system shall allow the admin to allocate an available room to a registered student and update occupancy automatically.

- FR-002.3: The system shall prevent allocation of a room that has reached maximum occupancy and shall display an error message.

- FR-002.4: The system shall prevent a student from having more than one active room allocation at a time.

- FR-002.5: The system shall allow the admin to reallocate a student with an active allocation to another available room and update the occupancy of both rooms automatically.

- FR-002.6: The system shall allow the admin to vacate a student's room only after the admin confirms the action, and shall update the room occupancy automatically.

## 5.3 Fee Payment and Tracking

Requirement ID: FR-003 \| Priority: High  
Description: Tracks hostel fee dues and payments for each student.

### Stimulus/Response Sequences

3.  Admin records a payment or an authorized payment workflow is completed → system updates the fee ledger → student views updated status.

### Functional Requirements

- FR-003.1: The system shall allow the admin to set the fee amount due and the due date for each student, shall record the amount and date of each payment, and shall calculate the outstanding balance as the amount due minus the total paid.

- FR-003.2: The system shall display fee status as Paid, Partially Paid, or Due on the student dashboard.

- FR-003.3: The system shall notify students whose fee due date is within 7 days, if the notification service is enabled.

- FR-003.4: The system shall reject a payment whose amount is zero, negative, or greater than the outstanding balance, and shall display an error message.

## 5.4 Complaint Management

Requirement ID: FR-004 \| Priority: Medium  
Description: Allows students to submit complaints and authorized staff to track and resolve them.

### Stimulus/Response Sequences

4.  Student submits category and description → complaint is created → admin reviews it → admin updates status and remarks → student views the updated status.

### Functional Requirements

- FR-004.1: The system shall allow a student to have at most one open complaint per category at a time.

- FR-004.2: The system shall allow the admin to update complaint status to In Progress, Resolved, or Rejected with remarks.

- FR-004.3: The system shall display complaint history with timestamps to the student who raised the complaint.

## 5.5 Leave, Visitor, Dashboard and Reports

Requirement ID: FR-005 \| Priority: Medium  
Description: Manages leave requests, visitor records, and administrative summaries/reports.

### Stimulus/Response Sequences

5.  Student submits leave request → admin approves/rejects → student views status. Admin/security logs visitor entry and exit. Admin opens dashboard and exports reports.

### Functional Requirements

- FR-005.1: The system shall allow a student to submit a leave request specifying start date, end date, and reason.

- FR-005.2: The system shall allow the admin to approve or reject a leave request, and the student shall be able to view the current status.

- FR-005.3: The system shall allow the admin to log visitor name, contact number, purpose, student visited, entry timestamp, and exit timestamp.

- FR-005.4: The system shall display total occupancy, vacant rooms, pending fee dues, and open complaints on the admin dashboard.

- FR-005.5: The system shall allow the admin to export student, fee, and complaint reports as CSV/PDF.

# 6. Other Nonfunctional Requirements

## 6.1 Performance Requirements

NFR-001: Performance.

- NFR-001.a: The system shall load each standard page within 3 seconds under normal load.

- NFR-001.b: The system shall support at least 200 concurrent users under normal load without significant degradation.

## 6.2 Security Requirements

NFR-002: Security.

- NFR-002.a: The system shall store passwords using a secure one-way hashing mechanism.

- NFR-002.b: The system shall enforce role-based access control for protected functions, and a student shall be able to access only that student's own records.

- NFR-002.c: The system shall automatically expire user sessions after 30 minutes of inactivity.

Additional operational controls: critical actions such as vacating a room (FR-002.6) shall require administrator confirmation; database backups shall be performed daily. These controls support safety and security and are not counted as additional NFR IDs.

## 6.3 Software Quality and Reliability

The system should be usable by first-time student users without external assistance for registration, maintain a modular code structure, and maintain at least 99% availability during the semester where the deployment environment permits measurement.

## 6.4 Business Rules

- Only Warden/Admin accounts can allocate, reallocate, or vacate rooms.

- A student may hold only one active room allocation at a time.

- A leave request must be approved by the admin before the student is marked as on leave.

- Complaint status changes shall be performed only by authorized staff.

- Room occupancy shall never exceed configured room capacity.

# 7. Other Requirements

- Database Requirement: All persistent data shall be stored in MongoDB with daily backups.

- Data Protection: Student personal data collected by HMS shall be used for hostel administration and shall not be shared with third parties without appropriate authorization.

- Reuse Objective: Authentication and role-based access modules should be designed so that they can be reused in future academic projects.

# Appendix A: Glossary

| **Term**     | **Definition**                                            |
|--------------|-----------------------------------------------------------|
| HMS          | Hostel Management System                                  |
| Warden/Admin | Hostel staff member responsible for hostel administration |
| USN          | University Seat Number, the student's unique identifier   |
| FR           | Functional Requirement                                    |
| NFR          | Nonfunctional Requirement                                 |
| UT / IT / ST | Unit Testing / Integration Testing / System Testing       |
| MERN         | MongoDB, Express, React, Node.js technology stack         |
| MongoDB      | Document database used to store HMS data                  |
| ADR          | Architecture Decision Record (`docs/ADR-001.md`)          |

# Appendix B: Field Layouts

Representative field layout for Student Registration and related hostel records:

| **Field**          | **Length** | **Data Type** | **Description**                        | **Mandatory** |
|--------------------|------------|---------------|----------------------------------------|---------------|
| USN                | 13         | Alphanumeric  | Unique student identifier              | Y             |
| Student Name       | 60         | String        | Full name of student                   | Y             |
| Email              | 80         | String        | Student email address                  | Y             |
| Phone Number       | 15         | String        | Student contact number                 | Y             |
| Room Number        | 6          | Alphanumeric  | Currently allocated room               | N             |
| Fee Status         | 15         | String        | Paid / Partially Paid / Due            | Y             |
| Complaint Category | 20         | String        | Category of complaint                  | N             |
| Leave Start Date   | 10         | Date          | Start date of approved/requested leave | N             |
| Leave End Date     | 10         | Date          | End date of approved/requested leave   | N             |
| Visitor Contact    | 15         | String        | Visitor contact number                 | N             |

# Appendix C: Requirement Traceability Matrix

The matrix maps each SRS v1.1 requirement to the architecture area and design section in SAD v1.1 and to the test cases in Test Plan v1.1. It is the v1.1 snapshot; the live statuses are kept in `docs/RTM.md`.

| **Req. ID** | **Requirement**                                                | **Architecture Area**           | **Design Section**         | **Test Case IDs**                                                     |
|-------------|----------------------------------------------------------------|---------------------------------|----------------------------|-----------------------------------------------------------------------|
| FR-001.1    | Student registration with required details (USN 13 characters) | Authentication & Student Module | 3.b.1, 3.b.3, 3.b.4        | UT-01, UT-04, UT-05, UT-28, ST-06                                     |
| FR-001.2    | USN and email uniqueness                                       | Authentication & Student Module | 3.b.4, 3.b.5.1             | UT-02, UT-03                                                          |
| FR-001.3    | Login by USN or email; 15-minute lockout after 5 failures      | Authentication & Authorization  | 3.a.5, 3.b.1, 3.b.3, 3.b.4 | UT-06, UT-07, UT-29, UT-30, IT-01, IT-02, IT-12, IT-13, ST-06, NFR-05 |
| FR-002.1    | Room availability by block, floor, sharing type                | Room & Allocation Module        | 3.b.3, 3.b.5               | UT-08, UT-31                                                          |
| FR-002.2    | Allocate a room and update occupancy                           | Room & Allocation Module        | 3.b.2, 3.b.5.1             | UT-09, IT-16, ST-01                                                   |
| FR-002.3    | Prevent allocation beyond capacity                             | Room & Allocation Module        | 3.b.2, 3.b.4, 3.b.5.1      | UT-10, IT-14, ST-02                                                   |
| FR-002.4    | One active allocation per student                              | Room & Allocation Module        | 3.a.6, 3.b.5.1             | UT-11, IT-16                                                          |
| FR-002.5    | Reallocate a student to another room                           | Room & Allocation Module        | 3.b.3, 3.b.5.1             | IT-03, IT-14, IT-16                                                   |
| FR-002.6    | Vacate a room after confirmation                               | Room & Allocation Module        | 3.b.3, 3.b.5.1, 3.b.6      | IT-04, IT-15, IT-16                                                   |
| FR-003.1    | Set fee due and due date; record payments and balance          | Fee Module                      | 3.b.3, 3.b.5               | UT-32, UT-12, UT-13, ST-03                                            |
| FR-003.2    | Paid / Partially Paid / Due status                             | Fee Module                      | 3.b.3, 3.b.5               | UT-14, UT-15, IT-06                                                   |
| FR-003.3    | Notify when due date is within 7 days, if enabled              | Fee Module + Notification Job   | 3.a.7, 3.b.6               | IT-07, IT-17                                                          |
| FR-003.4    | Reject zero, negative or excessive payments                    | Fee Module                      | 3.b.4, 3.b.5.1             | UT-16, UT-33, UT-34                                                   |
| FR-004.1    | At most one open complaint per category                        | Complaint Module                | 3.b.4, 3.b.5.1             | UT-17, UT-18, UT-19, UT-35, IT-20                                     |
| FR-004.2    | Admin status and remarks updates                               | Complaint Module                | 3.b.3, 3.b.4               | UT-20, UT-21, UT-36, UT-37, ST-04                                     |
| FR-004.3    | Complaint history with timestamps                              | Complaint Module                | 3.b.3, 3.b.5               | IT-08, ST-04                                                          |
| FR-005.1    | Leave request submission                                       | Admin Services                  | 3.b.3, 3.b.4               | UT-22, UT-23, UT-38, ST-05                                            |
| FR-005.2    | Leave approval/rejection; student views status                 | Admin Services                  | 3.b.3, 3.b.5.1             | UT-24, UT-25, IT-22, ST-05                                            |
| FR-005.3    | Visitor entry and exit log (admin)                             | Admin Services                  | 3.b.3, 3.b.4               | UT-26, UT-27, UT-39, UT-40                                            |
| FR-005.4    | Dashboard: occupancy, vacancies, dues, open complaints         | Admin Services                  | 3.a.7, 3.b.3               | IT-09                                                                 |
| FR-005.5    | Export reports as CSV and PDF                                  | Report Export                   | 3.b.3, 3.b.6               | IT-10, IT-11, IT-21                                                   |
| NFR-001.a   | Standard page load within 3 seconds                            | Application Infrastructure      | 3.a.7                      | NFR-01                                                                |
| NFR-001.b   | At least 200 concurrent users                                  | Application Infrastructure      | 3.a.7                      | NFR-04                                                                |
| NFR-002.a   | Password hashing                                               | Authentication & Authorization  | 3.a.5                      | NFR-02                                                                |
| NFR-002.b   | Role-based access; students access only their own records      | Authentication & Authorization  | 3.a.5, 3.b.3               | IT-05, UT-21, IT-18, IT-19, IT-21                                     |
| NFR-002.c   | Session expiry after 30 minutes of inactivity                  | Authentication & Authorization  | 3.a.5                      | NFR-03, NFR-05                                                        |
