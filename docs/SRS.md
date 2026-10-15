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

Revision History 3

1\. Introduction 4

1.1 Purpose 4

1.2 Intended Audience and Reading Suggestions 4

1.3 Product Scope 4

1.4 References 4

2\. Overall Description 4

2.1 Product Perspective 4

2.2 Product Functions 4

2.3 User Classes and Characteristics 5

2.4 Operating Environment 5

2.5 Design and Implementation Constraints 5

2.6 Assumptions and Dependencies 5

3\. External Interface Requirements 5

3.1 User Interfaces 5

3.2 Software Interfaces 5

3.3 Communications Interfaces 6

4\. Analysis Models 6

5\. System Features 6

5.1 Student Registration and Login 6

5.2 Room Allocation Management 6

5.3 Fee Payment and Tracking 7

5.4 Complaint Management 7

5.5 Leave, Visitor, Dashboard and Reports 7

6\. Other Nonfunctional Requirements 8

6.1 Performance Requirements 8

6.2 Security Requirements 8

7\. Other Requirements 8

Appendix A: Glossary 8

Appendix B: Field Layouts 9

Appendix C: Requirement Traceability Matrix 9

# Revision History

| **Name** | **Date**    | **Reason For Changes** | **Version** |
|----------|-------------|------------------------|-------------|
| Neha K S | 06-Sep-2026 | Initial draft of SRS   | 1.0         |
| Neha K S | 14-Oct-2026 | Revision for the MERN stack (MongoDB), SAD v1.1 and the approved backlog; see Summary of Changes | 1.1 |

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
| System Administrator | Manage user accounts and system-level settings.                                                            | Highest privilege; infrequent use.              |

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

The principal actors are Student, Warden/Admin, and System Administrator. Student use cases include Register, Login, View Room Status, View Fee Status, Raise Complaint, View Complaint History, and Request Leave. Warden/Admin use cases include Login, Allocate/Reallocate/Vacate Room, Record Fee Payment, Resolve Complaint, Approve/Reject Leave, Log Visitor Entry/Exit, and View/Export Reports. The System Administrator manages user accounts and system settings.

## 4.2 Entity-Relationship Model

The core data entities are User, Student, Room, Allocation, FeePayment, Complaint, LeaveRequest, and Visitor. A Student can have room allocation records over time but only one active allocation; a Room belongs to a hostel block and has a capacity; FeePayment and Complaint records reference the relevant Student; LeaveRequest records approval status; Visitor records reference the Student being visited.

Note: The detailed UML use-case diagram and ER diagram should be included in the final submission if the course requires graphical analysis models. The textual model above defines the actors, use cases, entities, and relationships that the diagrams must represent.

# 5. System Features

## 5.1 Student Registration and Login

Requirement ID: FR-001 \| Priority: High  
Description: Allows a student to register with required details and securely authenticate.

### Stimulus/Response Sequences

1.  Student opens registration → enters details → submits → system validates → account is created. Student then enters credentials → system authenticates → dashboard is displayed.

### Functional Requirements

- FR-001.1: The system shall allow a student to register using USN, name, email, phone number, and password.

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

## 5.3 Fee Payment and Tracking

Requirement ID: FR-003 \| Priority: High  
Description: Tracks hostel fee dues and payments for each student.

### Stimulus/Response Sequences

3.  Admin records a payment or an authorized payment workflow is completed → system updates the fee ledger → student views updated status.

### Functional Requirements

- FR-003.1: The system shall record fee amount due, amount paid, payment date, and outstanding balance for each student.

- FR-003.2: The system shall display fee status as Paid, Partially Paid, or Due on the student dashboard.

- FR-003.3: The system shall notify students whose fee due date is within 7 days, if the notification service is enabled.

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

NFR-001: The system shall load each standard page within 3 seconds and shall support at least 200 concurrent users under normal load without significant degradation.

## 6.2 Security Requirements

NFR-002: The system shall store passwords using a secure one-way hashing mechanism, enforce role-based access control for protected functions, and automatically expire user sessions after 30 minutes of inactivity.

Additional operational controls: critical actions such as room de-allocation and deletion of fee records shall require administrator confirmation; database backups shall be performed daily. These controls support safety and security but are not counted as additional NFR IDs so that the requirements set remains limited to two NFRs.

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

# Appendix B: Field Layouts

Representative field layout for Student Registration and related hostel records:

| **Field**          | **Length** | **Data Type** | **Description**                        | **Mandatory** |
|--------------------|------------|---------------|----------------------------------------|---------------|
| USN                | 10         | Alphanumeric  | Unique student identifier              | Y             |
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

The matrix below maps each functional/nonfunctional requirement to its feature, design area, implementation area, and test-case group. Test case IDs correspond to the separate Test Plan.

| **Sl. No.** | **Requirement ID** | **Brief Description**                 | **Architecture Reference**      | **Design Reference**            | **Test Case ID**      |
|-------------|--------------------|---------------------------------------|---------------------------------|---------------------------------|-----------------------|
| 1           | FR-001             | Student registration and login        | Authentication & Student Module | Auth/Student components         | FR001 test cases      |
| 2           | FR-002             | Room allocation management            | Room & Allocation Module        | Room/Allocation components      | FR002 test cases      |
| 3           | FR-003             | Fee payment and tracking              | Fee Module                      | Fee/Ledger components           | FR003 test cases      |
| 4           | FR-004             | Complaint management                  | Complaint Module                | Complaint workflow              | FR004 test cases      |
| 5           | FR-005             | Leave, visitor, dashboard and reports | Admin Services Module           | Leave/Visitor/Report components | FR005 test cases      |
| 6           | NFR-001            | Performance                           | Application Infrastructure      | Performance configuration       | NFR performance tests |
| 7           | NFR-002            | Security                              | Authentication & Authorization  | Security controls               | NFR security tests    |
