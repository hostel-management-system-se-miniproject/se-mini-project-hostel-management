**PES UNIVERSITY, BANGALORE**

# SOFTWARE REQUIREMENTS SPECIFICATION

**for**
**HOSTEL MANAGEMENT SYSTEM**

Version 1.1

Prepared by Neha K S, Raiesh Giriyapanavar (v1.0); revised by Team 3 (v1.1)

Team 3, Class 5-J: Raiesh Giriyapanavar, Chiranthan Sathrasala, Neha K S, Harsh M

14 October 2026

---

# Table of Contents

- Revision History
- Summary of Changes in v1.1
- 1. Introduction
  - 1.1 Purpose
  - 1.2 Intended Audience and Reading Suggestions
  - 1.3 Product Scope
  - 1.4 References
- 2. Overall Description
  - 2.1 Product Perspective
  - 2.2 Product Functions
  - 2.3 User Classes and Characteristics
  - 2.4 Operating Environment
  - 2.5 Design and Implementation Constraints
  - 2.6 Assumptions and Dependencies
- 3. External Interface Requirements
  - 3.1 User Interfaces
  - 3.2 Software Interfaces
  - 3.3 Communications Interfaces
- 4. Analysis Models
- 5. System Features
  - 5.1 Student Registration and Login
  - 5.2 Room Allocation Management
  - 5.3 Fee Payment and Tracking
  - 5.4 Complaint Management
  - 5.5 Leave, Visitor, Dashboard and Reports
- 6. Other Nonfunctional Requirements
  - 6.1 Performance Requirements
  - 6.2 Security Requirements
  - 6.3 Software Quality and Reliability
  - 6.4 Business Rules
- 7. Other Requirements
- Appendix A: Glossary
- Appendix B: Field Layouts
- Appendix C: Requirement Traceability Matrix

---

# Revision History

| Name | Date | Reason For Changes | Version |
| --- | --- | --- | --- |
| Neha K S | 06-Sep-2026 | Initial draft of SRS | 1.0 |
| Team 3 | 14-Oct-2026 | Revision for the MERN stack (MongoDB), numbered reallocate/vacate requirements, fee model clarification, role scope, USN format, and traceability to test case IDs. v1.0 is retained as the submitted baseline. | 1.1 |

# Summary of Changes in v1.1

The v1.0 document (06-Sep-2026) remains the submitted baseline. Version 1.1 changes the following. Each change is also recorded in `docs/DEVIATIONS.md`.

| # | Area | Change in v1.1 | Sections |
| --- | --- | --- | --- |
| 1 | Technology stack | The project uses the MERN stack required by the course. The relational database requirement is replaced by MongoDB. | 2.1, 2.4, 2.5, 3.2, 4.2, 7 |
| 2 | Room management | Reallocation and vacating are now numbered requirements FR-002.5 and FR-002.6, and vacating requires administrator confirmation. | 5.2, 6.4 |
| 3 | Fees | The admin sets the amount due and due date; payments are validated (positive, not above the outstanding balance); a new FR-003.4 is added. Deletion of fee records is removed. | 5.3, 6.2 |
| 4 | Reports | Reports are exported as both CSV and PDF (v1.0 wrote "CSV/PDF"). | 5.5 |
| 5 | User roles | Student and Warden/Admin only. The System Administrator class and a separate security user are out of scope; visitor entries are logged by the admin. Warden/Admin accounts are provisioned by seed data. | 2.3, 4.1, 5.5 |
| 6 | USN format | USN length changed from 10 to 13 characters (for example PES1UG24CS924). | 5.1, Appendix B |
| 7 | Nonfunctional requirements | NFR-001 and NFR-002 are kept, with labelled sub-requirements (a, b, c) so that each can be tested. Students may only access their own records. Lockout and session durations are configurable, with the stated defaults. | 6.1, 6.2 |
| 8 | Traceability | Appendix C maps each requirement to concrete test case IDs instead of group labels. | Appendix C |

---

# 1. Introduction

## 1.1 Purpose

This document specifies the software requirements for Version 1.1 of the Hostel Management System (HMS), a mini-project developed by Team 3. HMS is intended to replace register- and spreadsheet-based hostel record keeping with a centralized web-based system for managing student details, room allocation, hostel fees, complaints, leave requests, visitor entries, and administrative reports. This SRS covers the complete system.

## 1.2 Intended Audience and Reading Suggestions

This SRS is intended for the project guide/evaluator, development team, testers, hostel wardens/administrators, and students who will use or evaluate the system. Sections 1 and 2 provide an overview; Sections 3–7 define interfaces, functional and nonfunctional requirements; the appendices provide the glossary, field layouts, and traceability matrix.

## 1.3 Product Scope

HMS shall provide students with registration/login, room-status viewing, fee-status viewing, complaint submission, and leave-request facilities. Warden/admin users shall manage room allocation and vacancy, fee records, complaints, leave approvals, visitor entries, and reports. The system aims to reduce paperwork, minimize data-entry errors, and provide a consistent view of hostel records.

## 1.4 References

- IEEE 830 SRS template provided for the course.
- Team 3 project sheet (SE_Mini-Project_Teams).
- Test Plan Details document provided with the SRS template.
- Hostel Management System SRS Version 1.0, 06 September 2026 (submitted baseline).
- Hostel Management System Software Architecture & Design Specification and Test Plan (kept consistent with this version).
- `docs/DEVIATIONS.md` in the project repository.

# 2. Overall Description

## 2.1 Product Perspective

HMS is a new system being developed from scratch to replace manual hostel record keeping. It is built on the MERN stack and consists of a React web front end, a Node.js/Express back-end application server, and a MongoDB database. The browser communicates with the server using HTTPS, and the application server reads and writes persistent hostel data through the database.

## 2.2 Product Functions

- Student registration and login.
- Room allocation, reallocation, vacating, and vacancy tracking.
- Hostel fee recording and fee-status tracking.
- Complaint submission, tracking, and resolution.
- Leave-request submission and approval/rejection.
- Visitor entry and exit logging.
- Administrative dashboard and exportable reports (CSV and PDF).

## 2.3 User Classes and Characteristics

| User Class | Main Functions | Characteristics |
| --- | --- | --- |
| Student | Register/login, view room and fee status, raise complaints, submit leave requests, view complaint history. | Frequent user; basic computer literacy assumed. |
| Warden/Admin | Allocate/reallocate/vacate rooms, manage fees and complaints, approve leave, log visitors, view reports. | Privileged operational user. Accounts are provisioned by the system seed data and are not created through public registration. |

Out of scope for this version: a separate System Administrator class (user-account and system-settings management) and a separate security-guard user. Their intended functions are covered by the Warden/Admin class or by database/seed-data configuration.

## 2.4 Operating Environment

HMS shall operate as a web application on current supported versions of Chrome, Firefox, and Edge on desktop and mobile devices. The application server shall run on Node.js with the Express framework. The persistent database shall be MongoDB (a local MongoDB server or MongoDB Atlas).

## 2.5 Design and Implementation Constraints

- The project shall be completed within the mini-project schedule.
- The implementation shall use the MERN stack (MongoDB, Express.js, React, Node.js) as specified for Team 3 by the course.
- Source code and project documentation shall be maintained in the team's GitHub repository.
- The system shall run on the available lab/hosting environment.
- The implementation shall enforce data integrity rules (unique identifiers, one active allocation per student, room capacity) and appropriate access control. Because MongoDB does not enforce foreign keys or CHECK constraints, these rules shall be enforced through unique/partial indexes, atomic conditional updates, and server-side validation.

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

HMS shall use a MongoDB database to store user, student, room, allocation, fee, complaint, leave, and visitor records. The React web front end shall communicate with the Express back end through REST APIs, with structured JSON used for API request and response data.

## 3.3 Communications Interfaces

Browser-to-server communication shall use HTTPS. API communication shall use HTTP methods and JSON payloads. If notifications are implemented, the system may use an external email/SMS service; such integration is outside the mandatory core functionality unless specified by the final project implementation.

# 4. Analysis Models

## 4.1 Use Case Model

The principal actors are Student and Warden/Admin. Student use cases include Register, Login, View Room Status, View Fee Status, Raise Complaint, View Complaint History, and Request Leave. Warden/Admin use cases include Login, Allocate/Reallocate/Vacate Room, Set Fee Due and Record Fee Payment, Resolve Complaint, Approve/Reject Leave, Log Visitor Entry/Exit, and View/Export Reports.

## 4.2 Entity-Relationship Model

The core data entities are User, Student, Room, Allocation, FeeRecord (with its payment entries), Complaint, LeaveRequest, and Visitor. In MongoDB these are stored as collections, with references between them (for example, an allocation references a student and a room). A Student can have room allocation records over time but only one active allocation; a Room belongs to a hostel block and has a capacity and an occupancy count; a FeeRecord references the relevant Student and holds the amount due, due date, and the list of payments; Complaint records reference the relevant Student; LeaveRequest records approval status; Visitor records reference the Student being visited.

Note: The detailed UML use-case diagram and ER diagram are maintained in `docs/diagrams/` in the project repository. The textual model above defines the actors, use cases, entities, and relationships that the diagrams must represent.

# 5. System Features

## 5.1 Student Registration and Login

Requirement ID: FR-001 | Priority: High

Description: Allows a student to register with required details and securely authenticate.

### Stimulus/Response Sequences

1. Student opens registration → enters details → submits → system validates → account is created. User then enters credentials → system authenticates → dashboard is displayed.

### Functional Requirements

- **FR-001.1:** The system shall allow a student to register using USN (13 alphanumeric characters, for example PES1UG24CS924), name, email, phone number, and password.
- **FR-001.2:** The system shall validate that USN and email are unique before creating an account.
- **FR-001.3:** The system shall authenticate registered users (students and Warden/Admin) using USN/email and password and temporarily lock the account for 15 minutes after 5 consecutive failed login attempts.

## 5.2 Room Allocation Management

Requirement ID: FR-002 | Priority: High

Description: Allows authorized hostel staff to allocate, reallocate, and vacate rooms while maintaining occupancy.

### Stimulus/Response Sequences

1. Admin selects a student → system displays available rooms → admin selects a room → system checks capacity and active allocation → allocation is saved and occupancy is updated.
2. Admin selects an allocated student → chooses reallocate and a new available room, or vacate → system asks for confirmation → on confirmation the allocation change is saved and the occupancy of the affected rooms is updated.

### Functional Requirements

- **FR-002.1:** The system shall display room availability by block, floor, and sharing type.
- **FR-002.2:** The system shall allow the admin to allocate an available room to a registered student and update occupancy automatically.
- **FR-002.3:** The system shall prevent allocation of a room that has reached maximum occupancy and shall display an error message.
- **FR-002.4:** The system shall prevent a student from having more than one active room allocation at a time.
- **FR-002.5:** The system shall allow the admin to reallocate a student from the current room to another available room, releasing the previous allocation and updating the occupancy of both rooms consistently.
- **FR-002.6:** The system shall allow the admin to vacate a student's active allocation after administrator confirmation, marking the allocation inactive and reducing the room's occupancy.

## 5.3 Fee Payment and Tracking

Requirement ID: FR-003 | Priority: High

Description: Tracks hostel fee dues and payments for each student.

### Stimulus/Response Sequences

1. Admin sets the amount due and due date for a student, and records a payment or an authorized payment workflow is completed → system updates the fee ledger → student views updated status.

### Functional Requirements

- **FR-003.1:** The system shall allow the admin to set the fee amount due and due date for a student, and shall record each payment (amount paid and payment date) so that the outstanding balance (amount due minus total paid) is maintained for each student.
- **FR-003.2:** The system shall display fee status as Paid (outstanding balance is zero), Partially Paid (some amount paid and a balance remains), or Due (no payment recorded) on the student dashboard.
- **FR-003.3:** The system shall notify students whose fee due date is within 7 days, if the notification service is enabled.
- **FR-003.4:** The system shall reject a payment whose amount is zero, negative, or greater than the outstanding balance, and shall display an error message.

## 5.4 Complaint Management

Requirement ID: FR-004 | Priority: Medium

Description: Allows students to submit complaints and authorized staff to track and resolve them.

### Stimulus/Response Sequences

1. Student submits category and description → complaint is created → admin reviews it → admin updates status and remarks → student views the updated status.

### Functional Requirements

- **FR-004.1:** The system shall allow a student to have at most one open complaint per category at a time.
- **FR-004.2:** The system shall allow the admin to update complaint status to In Progress, Resolved, or Rejected with remarks.
- **FR-004.3:** The system shall display complaint history with timestamps to the student who raised the complaint.

## 5.5 Leave, Visitor, Dashboard and Reports

Requirement ID: FR-005 | Priority: Medium

Description: Manages leave requests, visitor records, and administrative summaries/reports.

### Stimulus/Response Sequences

1. Student submits leave request → admin approves/rejects → student views status. Admin logs visitor entry and exit. Admin opens dashboard and exports reports.

### Functional Requirements

- **FR-005.1:** The system shall allow a student to submit a leave request specifying start date, end date, and reason.
- **FR-005.2:** The system shall allow the admin to approve or reject a leave request, and the student shall be able to view the current status.
- **FR-005.3:** The system shall allow the admin to log visitor name, contact number, purpose, student visited, entry timestamp, and exit timestamp.
- **FR-005.4:** The system shall display total occupancy, vacant rooms, pending fee dues, and open complaints on the admin dashboard.
- **FR-005.5:** The system shall allow the admin to export student, fee, and complaint reports as both CSV and PDF.

# 6. Other Nonfunctional Requirements

## 6.1 Performance Requirements

**NFR-001:** The system shall meet the following performance targets.

- **NFR-001.a:** Each standard page shall load within 3 seconds under normal conditions.
- **NFR-001.b:** The system shall support at least 200 concurrent users under normal load without significant degradation.

Verification note: NFR-001.a is verified by timing the main pages. NFR-001.b is verified by a load test where the environment allows; measured results and any environmental limitations are reported as they are, and the target is not claimed as met without evidence.

## 6.2 Security Requirements

**NFR-002:** The system shall meet the following security requirements.

- **NFR-002.a:** The system shall store passwords using a secure one-way hashing mechanism and never in plaintext.
- **NFR-002.b:** The system shall enforce role-based access control for protected functions on the server side, and a student shall be able to access only their own records (for example their own fee, complaint, leave, and dashboard data).
- **NFR-002.c:** The system shall automatically expire user sessions after 30 minutes of inactivity.

Additional operational controls: critical actions such as room vacating shall require administrator confirmation; database backups shall be performed daily; the login lockout duration (15 minutes), the number of failed attempts (5), and the session timeout (30 minutes) shall be configurable, with these values as defaults. These controls support safety and security but are not counted as additional NFR IDs so that the requirements set remains limited to two NFRs.

## 6.3 Software Quality and Reliability

The system should be usable by first-time student users without external assistance for registration, maintain a modular code structure, and maintain at least 99% availability during the semester where the deployment environment permits measurement.

## 6.4 Business Rules

- Only Warden/Admin accounts can allocate, reallocate, or vacate rooms.
- A student may hold only one active room allocation at a time.
- Vacating a room requires administrator confirmation.
- A leave request must be approved by the admin before the student is marked as on leave.
- Complaint status changes shall be performed only by authorized staff.
- Room occupancy shall never exceed configured room capacity.
- A fee payment shall be a positive amount and shall not exceed the student's outstanding balance.

# 7. Other Requirements

- Database Requirement: All persistent data shall be stored in MongoDB, with daily backups.
- Data Protection: Student personal data collected by HMS shall be used for hostel administration and shall not be shared with third parties without appropriate authorization.
- Reuse Objective: Authentication and role-based access modules should be designed so that they can be reused in future academic projects.

# Appendix A: Glossary

| Term | Definition |
| --- | --- |
| HMS | Hostel Management System |
| Warden/Admin | Hostel staff member responsible for hostel administration |
| USN | University Seat Number, the student's unique identifier (13 characters, for example PES1UG24CS924) |
| FR | Functional Requirement |
| NFR | Nonfunctional Requirement |
| UT / IT / ST | Unit Testing / Integration Testing / System Testing |
| MERN | MongoDB, Express.js, React, Node.js technology stack |
| RBAC | Role-Based Access Control |
| Active allocation | A room allocation that has not been vacated or replaced by a reallocation |

# Appendix B: Field Layouts

Representative field layout for Student Registration and related hostel records:

| Field | Length | Data Type | Description | Mandatory |
| --- | --- | --- | --- | --- |
| USN | 13 | Alphanumeric | Unique student identifier | Y |
| Student Name | 60 | String | Full name of student | Y |
| Email | 80 | String | Student email address | Y |
| Phone Number | 15 | String | Student contact number | Y |
| Room Number | 6 | Alphanumeric | Currently allocated room | N |
| Fee Amount Due | 10 | Decimal | Fee amount due for the student | Y |
| Fee Due Date | 10 | Date | Date by which the fee must be paid | Y |
| Fee Status | 15 | String | Paid / Partially Paid / Due | Y |
| Complaint Category | 20 | String | Category of complaint | N |
| Leave Start Date | 10 | Date | Start date of approved/requested leave | N |
| Leave End Date | 10 | Date | End date of approved/requested leave | N |
| Visitor Contact | 15 | String | Visitor contact number | N |

# Appendix C: Requirement Traceability Matrix

The matrix below maps each functional and nonfunctional requirement to its feature, architecture area, and test cases. Test case IDs are those of the Test Plan. Entries marked "+ new" are covered by additional test cases that are added in Test Plan v1.1.

| Sl. No. | Requirement ID | Brief Description | Architecture Reference | Design Reference | Test Case ID |
| --- | --- | --- | --- | --- | --- |
| 1 | FR-001.1 | Student registration with required details | Authentication & Student Module | Auth/Student components | UT-01, UT-04, UT-05 + new (USN format) |
| 2 | FR-001.2 | USN and email uniqueness | Authentication & Student Module | Auth/Student components | UT-02, UT-03 |
| 3 | FR-001.3 | Login with USN/email, 15-minute lockout after 5 failures | Authentication & Authorization | Auth components | UT-06, UT-07, IT-01, IT-02 + new (login by email) |
| 4 | FR-002.1 | Room availability by block, floor, sharing type | Room & Allocation Module | Room/Allocation components | UT-08 |
| 5 | FR-002.2 | Allocate a room and update occupancy | Room & Allocation Module | Room/Allocation components | UT-09, ST-01 |
| 6 | FR-002.3 | Prevent allocation beyond capacity | Room & Allocation Module | Room/Allocation components | UT-10, ST-02 |
| 7 | FR-002.4 | One active allocation per student | Room & Allocation Module | Room/Allocation components | UT-11 |
| 8 | FR-002.5 | Reallocate a student to another room | Room & Allocation Module | Room/Allocation components | IT-03 |
| 9 | FR-002.6 | Vacate a room with confirmation | Room & Allocation Module | Room/Allocation components | IT-04 |
| 10 | FR-003.1 | Set fee due and due date; record payments and balance | Fee Module | Fee/Ledger components | UT-12, UT-13, ST-03 |
| 11 | FR-003.2 | Display Paid / Partially Paid / Due status | Fee Module | Fee/Ledger components | UT-14, UT-15, IT-06 |
| 12 | FR-003.3 | Due-date notification (if enabled) | Fee Module + Notification Service | Notification trigger | IT-07 |
| 13 | FR-003.4 | Reject zero, negative or excessive payments | Fee Module | Fee/Ledger components | UT-16 + new (overpayment) |
| 14 | FR-004.1 | One open complaint per category | Complaint Module | Complaint workflow | UT-17, UT-18, UT-19 |
| 15 | FR-004.2 | Admin status and remarks update | Complaint Module | Complaint workflow | UT-20, UT-21, ST-04 |
| 16 | FR-004.3 | Complaint history with timestamps | Complaint Module | Complaint workflow | IT-08 + new |
| 17 | FR-005.1 | Leave request submission | Admin Services Module | Leave components | UT-22, UT-23 |
| 18 | FR-005.2 | Leave approval/rejection and status view | Admin Services Module | Leave components | UT-24, UT-25, ST-05 |
| 19 | FR-005.3 | Visitor entry and exit log | Admin Services Module | Visitor components | UT-26, UT-27 |
| 20 | FR-005.4 | Admin dashboard summary | Admin Services Module | Dashboard components | IT-09 |
| 21 | FR-005.5 | Export reports as CSV and PDF | Admin Services + Report Export | Report components | IT-10, IT-11 |
| 22 | NFR-001.a | Standard page load within 3 seconds | Application Infrastructure | Performance configuration | NFR-01 |
| 23 | NFR-001.b | 200 concurrent users | Application Infrastructure | Performance configuration | Load test (added in Test Plan v1.1) |
| 24 | NFR-002.a | Password hashing | Authentication & Authorization | Security controls | NFR-02 |
| 25 | NFR-002.b | Role-based access control and own-records access | Authentication & Authorization | Security controls | IT-05, UT-21 + new (student accessing another student's data) |
| 26 | NFR-002.c | 30-minute session expiry | Authentication & Authorization | Security controls | NFR-03 |
