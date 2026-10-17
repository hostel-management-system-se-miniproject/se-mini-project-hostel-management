**PES UNIVERSITY, BANGALORE**

**SOFTWARE ARCHITECTURE & DESIGN SPECIFICATION**

for

**HOSTEL MANAGEMENT SYSTEM**

Version 1.0

**Team 3 — 5-J**

| **USN**       | **Team Member**       |
|---------------|-----------------------|
| PES1UG24CS924 | Raiesh Giriyapanavar  |
| PES1UG24CS565 | Chiranthan Sathrasala |
| PES1UG24CS581 | Neha K S              |
| PES1UG24CS573 | Harsh M               |

Reference: Hostel Management System SRS v1.0, 06 September 2026

Prepared by Harsh M, for Software Engineering Mini-Project Evaluation

# Document Control

| **Item** | **Details** |
|----|----|
| Document | Software Architecture & Design Specification |
| System | Hostel Management System (HMS) |
| Version | 1.0 |
| Base Requirements | HMS SRS v1.0 dated 06-Sep-2026 |
| Related Verification Document | HMS Test Plan |
| Team | Team 3, Class 5-J |
| Preparation Date | 02-Oct-2026 |

## Revision History

| **Name** | **Date** | **Reason For Changes** | **Version** |
|----|----|----|----|
| Team 3 | 02-Oct-2026 | Initial architecture and design specification based on SRS v1.0 | 1.0 |

## Basis and Scope of this Document

This document defines the software architecture and detailed design for
the Hostel Management System. It follows the section structure specified
for the Software Architecture & Design Specification and uses the
functional and nonfunctional requirements in the team's SRS as the
baseline. The supplied repository snapshot contains the SRS and Test
Plan documents; therefore, implementation-specific details that are not
defined in those documents are presented here as the proposed design
contract and should be kept consistent with the final codebase.

# Contents

3\. Software Architecture & Design Specification

3.a Architecture

3.a.1 Component Diagram and Description

3.a.2 Architectural Pattern

3.a.3 Architecture Decisions and Responsibilities

3.a.4 Traceability to Requirements

3.a.5 Security Architecture

3.a.6 Deployment and Data Architecture

3.a.7 Other Architecture Sections

3.b Design

3.b.1 UML Sequence Diagram — Student Registration and Login

3.b.2 UML Sequence Diagram — Room Allocation

3.b.3 API Design

3.b.4 Error Handling

3.b.5 Data and Component Design

3.b.6 Other Design Sections

# 3. Software Architecture & Design Specification

## 3.a Architecture

### 3.a.1 Component Diagram and Description

The architecture is organized as a web-based three-layer system. The
browser provides the role-specific user interface, the application/API
layer implements authentication and hostel business rules, and the
relational database provides persistent storage. The modules in the
application layer are separated by responsibility so that the
requirements can be implemented and tested independently.

<img src="media/image1.png" style="width:6.55in;height:2.74694in" />

Figure 1. Component-level architecture of the Hostel Management System.

The major components and their responsibilities are listed below.

| **Component** | **Responsibility** | **Primary Requirements** |
|----|----|----|
| Presentation Layer | Provides student and admin/warden screens, forms, dashboards, validation feedback, and report download actions. | FR-001 to FR-005, NFR-001 |
| Authentication & Authorization | Registration, login, password verification, failed-login lockout, role checks, and session control. | FR-001, NFR-002 |
| Student Module | Student profile/dashboard data, room and fee status, complaint history, and leave request access. | FR-001, FR-003, FR-004, FR-005 |
| Room & Allocation Module | Room filtering, allocation, reallocation, vacating, capacity checks, and active-allocation rules. | FR-002 |
| Fee Module | Fee ledger, payment recording, balance calculation, status tracking, and optional due-date notification trigger. | FR-003 |
| Complaint Module | Complaint creation, category-level open-complaint rule, status updates, remarks, and history. | FR-004 |
| Admin Services | Leave approval, visitor logging, dashboard aggregation, and report generation. | FR-005 |
| Relational Database | Stores users, students, rooms, allocations, fee records, complaints, leave requests, and visitor records. | All persistent requirements |
| Report Export | Produces student, fee, and complaint reports in CSV/PDF form. | FR-005.5 |
| Optional Notification Service | Sends fee due-date notifications when an external email/SMS service is enabled. | FR-003.3 |

### 3.a.2 Architectural Pattern

The recommended architectural pattern is a layered, modular monolithic
web application with a REST API. This is appropriate for the project
because the SRS specifies a web front end, a back-end application
server, a relational database, and REST/JSON communication. The modules
remain logically separated without introducing the operational overhead
of multiple independently deployed services.

| **Layer** | **Main Role** | **Design Rule** |
|----|----|----|
| Presentation | Browser-based student and admin interfaces. | Do not access the database directly; communicate through the API. |
| Application / API | Business rules, authentication, authorization, validation, module workflows, and response generation. | Keep module responsibilities separate and validate business rules before database updates. |
| Data | Relational persistence and transactionally consistent updates. | Use controlled data access; maintain referential integrity and enforce one active allocation per student. |

The architecture follows a separation-of-concerns principle. For
example, the room module is responsible for capacity and allocation
rules, while authentication is responsible for identity and role checks.
This reduces coupling and allows the test cases in the Test Plan to map
to individual functional modules.

### 3.a.3 Architecture Decisions and Responsibilities

| **Decision** | **Rationale** | **Effect on System** |
|----|----|----|
| REST API with JSON | Explicitly specified in the SRS software-interface requirements. | Provides a consistent contract between browser and application server. |
| Relational database | Required by the SRS and suitable for related hostel records. | Supports relationships, constraints, transactions, and reporting. |
| Role-based access control | Required because students and Warden/Admin users have different operations. | Prevents students from invoking protected administrative functions. |
| Modular application layer | Functional requirements naturally divide into authentication, rooms, fees, complaints, and admin services. | Simplifies development, testing, maintenance, and traceability. |
| Centralized validation | Business rules must be enforced even if a request bypasses the normal UI. | Prevents invalid allocation, complaint, leave, and payment operations. |

### 3.a.4 Traceability to Requirements

The following matrix connects each SRS requirement to the
architecture/design section that realizes it and to the corresponding
test group. Test-case identifiers follow the supplied Test Plan; the
table uses the group identifiers FR001–FR005 and NFR test groups used in
the SRS traceability matrix.

| **Req. ID** | **Requirement** | **Architecture Area** | **Design Section** | **Verification** |
|----|----|----|----|----|
| FR-001.1 | Student registration with required details | Authentication & Student Module | 3.a.1, 3.b.3, 3.b.4 | FR001 test cases |
| FR-001.2 | USN and email uniqueness validation | Authentication & Student Module | 3.a.3, 3.b.4 | FR001 test cases |
| FR-001.3 | Login and 15-minute lockout after 5 failures | Authentication & Authorization | 3.a.5, 3.b.3, 3.b.4 | FR001 test cases |
| FR-002.1 | Room availability by block/floor/sharing type | Room & Allocation Module | 3.a.1, 3.b.3, 3.b.5 | FR002 test cases |
| FR-002.2 | Allocate room and update occupancy | Room & Allocation Module | 3.a.1, 3.b.2, 3.b.5 | FR002 test cases |
| FR-002.3 | Prevent allocation beyond capacity | Room & Allocation Module | 3.a.3, 3.b.2, 3.b.4 | FR002 test cases |
| FR-002.4 | Only one active allocation per student | Room & Allocation Module | 3.a.6, 3.b.2, 3.b.5 | FR002 test cases |
| FR-003.1 | Record due, paid, date, and balance | Fee Module | 3.a.1, 3.b.3, 3.b.5 | FR003 test cases |
| FR-003.2 | Display Paid/Partially Paid/Due status | Fee Module | 3.a.1, 3.b.3 | FR003 test cases |
| FR-003.3 | Notify when due date is within 7 days if enabled | Fee Module + Notification Service | 3.a.1, 3.a.7, 3.b.3 | FR003 test cases |
| FR-004.1 | At most one open complaint per category | Complaint Module | 3.a.1, 3.b.4, 3.b.5 | FR004 test cases |
| FR-004.2 | Admin status and remarks updates | Complaint Module | 3.a.1, 3.b.3, 3.b.4 | FR004 test cases |
| FR-004.3 | Student complaint history with timestamps | Complaint Module | 3.a.1, 3.b.3, 3.b.5 | FR004 test cases |
| FR-005.1 | Student leave request | Admin Services Module | 3.a.1, 3.b.3, 3.b.4 | FR005 test cases |
| FR-005.2 | Admin approve/reject leave; student views status | Admin Services Module | 3.a.1, 3.b.3 | FR005 test cases |
| FR-005.3 | Visitor entry and exit logging | Admin Services Module | 3.a.1, 3.b.3, 3.b.5 | FR005 test cases |
| FR-005.4 | Dashboard occupancy, vacancies, dues, complaints | Admin Services Module | 3.a.1, 3.a.6, 3.b.3 | FR005 test cases |
| FR-005.5 | Export student/fee/complaint reports as CSV/PDF | Admin Services + Report Export | 3.a.1, 3.b.3 | FR005 test cases |
| NFR-001 | 3-second standard page load and 200 concurrent users | Application Infrastructure | 3.a.2, 3.a.7, 3.b.6 | NFR performance tests |
| NFR-002 | Hashing, RBAC, and 30-minute session expiry | Authentication & Authorization | 3.a.5, 3.b.4 | NFR security tests |

### 3.a.5 Security Architecture

Security is implemented as a cross-cutting concern around
authentication, authorization, session management, input validation, and
protected data access. The controls below directly address NFR-002 and
the related business rules.

| **Security Control** | **Design** | **Requirement / Risk Addressed** |
|----|----|----|
| Password storage | Store only a secure one-way password hash; never store plaintext passwords. | NFR-002 |
| Authentication | Validate credentials through the authentication module and return a controlled authenticated session. | FR-001.3 |
| Login lockout | Track consecutive failed attempts and lock the account for 15 minutes after 5 consecutive failures. | FR-001.3 |
| Role-based authorization | Check the authenticated role before room, fee, complaint, leave, visitor, and report operations. | NFR-002; business rules |
| Session expiry | Expire authenticated sessions after 30 minutes of inactivity and require re-authentication. | NFR-002 |
| Transport security | Use HTTPS between browser and server. | SRS Communications Interface |
| Input validation | Validate required fields, formats, date ranges, amounts, identifiers, and business rules at the API boundary. | FR-001 to FR-005 |
| Protected critical actions | Require administrator confirmation for critical actions such as room de-allocation and fee-record deletion. | SRS operational controls |
| Data protection | Use hostel administration data only for authorized system purposes and restrict access by role. | Other Requirements |
| Backups | Perform daily database backups as an operational safeguard. | SRS database requirement |

#### Security Request Flow

1.  The browser sends an HTTPS request containing the required
    authentication/session information.

2.  The API authentication middleware validates the session and
    determines the user's role.

3.  The target module checks whether that role is authorized for the
    requested operation.

4.  The module validates request data and business rules before changing
    persistent data.

5.  The database operation is executed only after validation and
    authorization succeed.

6.  The API returns a controlled JSON response without exposing
    passwords, internal database details, or sensitive implementation
    information.

### 3.a.6 Deployment and Data Architecture

The deployment model is a conventional client-server web deployment.
Students and administrators use a supported browser. The application
server hosts the REST API and business modules. The relational database
is kept behind the application layer rather than being directly
accessible from the browser.

| **Node / Store** | **Contents** | **Communication** |
|----|----|----|
| Student/Admin Device | Browser UI and temporary client-side session state. | HTTPS to application server |
| Application Server | REST API, authentication, business modules, validation, reporting logic. | HTTPS from clients; database connection to data store |
| Relational Database | Users, students, rooms, allocations, fee records, complaints, leave requests, visitor records. | Private application-to-database connection |
| Optional External Notification Provider | Email/SMS delivery when enabled. | Server-side integration only |

The logical data model follows the entities identified in the SRS: User,
Student, Room, Allocation, FeePayment, Complaint, LeaveRequest, and
Visitor. Student-to-Allocation is one-to-many over time, while only one
allocation may be active for a student. Room capacity is used to prevent
occupancy from exceeding the configured limit.

### 3.a.7 Other Architecture Sections

#### Scalability and Performance

NFR-001 requires standard pages to load within 3 seconds and the system
to support at least 200 concurrent users under normal load. The
architecture supports this target by keeping the browser lightweight,
using a centralized API layer, separating modules, and keeping
persistent state in a relational database. Actual 200-user capacity
requires load testing in an environment capable of generating that
traffic; it is not claimed as verified by this document.

#### Reliability and Consistency

- Room allocation and occupancy updates should be treated as one logical
  transaction so that occupancy is not changed without a corresponding
  allocation record.

- Reallocation should release the old allocation and create/update the
  new allocation consistently.

- Fee balance should be derived from the stored due and paid values
  rather than manually entered independently.

- Daily backups should be retained according to the project's deployment
  policy.

- Errors in one functional module should return controlled API responses
  rather than exposing internal exceptions.

#### Maintainability

The module boundaries are intentionally aligned with the functional
requirements and test groups. This gives the team a direct mapping
between requirements, application components, APIs, database entities,
and test cases. Authentication and role-based access are isolated so
they can be reused in future academic projects, as requested by the SRS.

## 3.b Design

### 3.b.1 UML Sequence Diagram — Student Registration and Login

The following sequence describes the common authentication path.
Registration and login share the authentication component, while
registration additionally creates a user record after uniqueness and
field validation.

<img src="media/image2.png" style="width:5.9in;height:3.02682in" />

Figure 2. Sequence flow for student registration/login and
authentication.

#### Sequence Description

7.  The student enters registration details or login credentials through
    the web interface.

8.  The web interface sends a JSON request to the authentication API
    over HTTPS.

9.  For registration, the API checks mandatory fields and verifies that
    the USN and email are not already registered.

10. For login, the API retrieves the relevant account and verifies the
    supplied password against the stored password hash.

11. After successful registration, the account is created. After
    successful login, an authenticated session is established.

12. The API returns a controlled response. The interface either displays
    the dashboard or an appropriate validation/authentication message.

13. Repeated failed logins are counted; after five consecutive failures,
    the account is locked for 15 minutes.

### 3.b.2 UML Sequence Diagram — Room Allocation

The room allocation sequence shows how the system enforces the two main
business constraints: the room must have capacity and the student must
not already have another active allocation.

<img src="media/image3.png" style="width:5.9in;height:2.63859in" />

Figure 3. Sequence flow for Warden/Admin room allocation.

#### Sequence Description

14. The Warden/Admin selects a registered student and requests available
    rooms using the admin interface.

15. The interface requests matching rooms from the room/allocation API
    using the selected block, floor, and sharing filters.

16. Before saving an allocation, the API checks the student's active
    allocation state and the selected room's current occupancy/capacity.

17. If either business rule fails, the API returns a controlled error
    and no persistent allocation change is made.

18. If validation succeeds, the allocation and occupancy update are
    committed as one logical operation.

19. The updated allocation is returned to the admin interface, where the
    new room status is displayed.

### 3.b.3 API Design

The SRS specifies REST APIs with JSON request and response data. The
following endpoint set is the proposed design contract for the
documented HMS features. Exact route naming may be adjusted to match the
final codebase, but the request/response responsibilities should remain
equivalent.

| **Method** | **Endpoint** | **Role** | **Purpose** | **Typical Status** |
|----|----|----|----|----|
| POST | /api/auth/register | Student | Register a student account. | 201 / 400 / 409 |
| POST | /api/auth/login | Student/Admin | Authenticate user and establish session. | 200 / 401 / 423 |
| POST | /api/auth/logout | Authenticated user | End current authenticated session. | 200 / 401 |
| GET | /api/students/{usn}/dashboard | Student/Admin | Return room, fee, complaint, and leave summary. | 200 / 401 / 403 / 404 |
| GET | /api/rooms | Warden/Admin | Filter rooms by block, floor, sharing type, and availability. | 200 / 401 / 403 |
| POST | /api/allocations | Warden/Admin | Create an active room allocation after validation. | 201 / 400 / 403 / 409 |
| PUT | /api/allocations/{id}/reallocate | Warden/Admin | Move a student to another room. | 200 / 400 / 403 / 409 |
| POST | /api/allocations/{id}/vacate | Warden/Admin | Deactivate an allocation and release occupancy. | 200 / 400 / 403 / 404 |
| POST | /api/fees/payments | Warden/Admin | Record a fee payment and update balance. | 201 / 400 / 403 / 404 |
| GET | /api/fees/{usn} | Student/Admin | View fee status, balance, and payment history. | 200 / 401 / 403 / 404 |
| POST | /api/complaints | Student | Create a complaint subject to category rule. | 201 / 400 / 409 |
| PUT | /api/complaints/{id} | Warden/Admin | Update complaint status and remarks. | 200 / 400 / 403 / 404 |
| POST | /api/leaves | Student | Submit a leave request. | 201 / 400 |
| PUT | /api/leaves/{id}/decision | Warden/Admin | Approve or reject a leave request. | 200 / 400 / 403 / 404 |
| POST | /api/visitors | Warden/Admin | Record visitor entry details. | 201 / 400 / 403 |
| PUT | /api/visitors/{id}/exit | Warden/Admin | Record visitor exit timestamp. | 200 / 400 / 403 / 404 |
| GET | /api/admin/dashboard | Warden/Admin | Return occupancy, vacancies, pending dues, and open complaints. | 200 / 401 / 403 |
| GET | /api/reports/{type} | Warden/Admin | Generate/export student, fee, or complaint report. | 200 / 400 / 403 |

#### API Request and Response Convention

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>POST /api/auth/login<br />
Content-Type: application/json<br />
<br />
{<br />
"usn": "PES1UG23CS001",<br />
"password": "Pass@123"<br />
}<br />
<br />
Success:<br />
{<br />
"success": true,<br />
"message": "Login successful",<br />
"data": {<br />
"role": "student"<br />
}<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

Passwords are shown only as example input data in the request format
above. They must never be returned in API responses or stored as
plaintext. Authentication/session details should be represented using
the mechanism selected by the final implementation.

#### Common JSON Error Format

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th>{<br />
"success": false,<br />
"error": {<br />
"code": "ROOM_FULL",<br />
"message": "Room at full capacity",<br />
"details": {}<br />
}<br />
}</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

A common response structure keeps frontend handling consistent across
modules. The error code should be stable enough for the frontend to
identify the error category, while the message should remain
understandable to the user.

### 3.b.4 Error Handling

Errors are divided into validation errors, authentication/authorization
errors, business-rule conflicts, resource errors, and unexpected server
errors. The API should return an appropriate HTTP status code and a safe
message. Internal stack traces, database credentials, SQL statements,
and other implementation details must not be returned to the browser.

| **Category** | **HTTP Status** | **Example** | **Expected Handling** |
|----|----|----|----|
| Validation | 400 Bad Request | Missing phone number; invalid email; end date before start date; negative payment. | Reject request and identify the invalid input. |
| Authentication | 401 Unauthorized | Invalid credentials; expired session. | Require login or re-authentication. |
| Authorization | 403 Forbidden | Student attempts room allocation. | Deny operation and do not modify data. |
| Conflict | 409 Conflict | Duplicate USN/email; full room; second active allocation; duplicate open complaint category. | Reject operation and explain the business-rule conflict. |
| Not Found | 404 Not Found | Unknown student, room, complaint, leave, or visitor record. | Return resource-not-found message. |
| Locked | 423 Locked | Login attempted during 15-minute lockout. | Reject login and return lockout information without revealing unnecessary account details. |
| Server Error | 500 Internal Server Error | Unexpected application/database failure. | Log internally; return a generic safe message to the client. |

#### Validation Rules

- USN and email must be unique before account creation.

- Required registration fields must not be blank.

- Room allocation requires a registered student, an available room, and
  no existing active allocation.

- Room occupancy must not exceed configured capacity.

- Payment amount must be a positive value and must be processed against
  the student's current fee record.

- Leave end date must not precede the start date.

- A student cannot create a second open complaint in the same category.

- Protected administrative operations must pass role authorization
  before business validation is applied.

### 3.b.5 Data and Component Design

The data design follows the entities listed in the SRS and keeps
operational records separate enough to support history. The following
logical entities form the core database design.

| **Entity** | **Important Attributes** | **Relationship / Constraint** |
|----|----|----|
| User | user_id, USN/email, password_hash, role, failed_attempts, lock_until, session information | Authentication identity; role controls protected functions. |
| Student | student_id, USN, name, email, phone | Associated with a user account; referenced by hostel records. |
| Room | room_id, block, floor, sharing_type, capacity, occupancy | Capacity is an upper bound on occupancy. |
| Allocation | allocation_id, student_id, room_id, start/end or active state | A student may have historical allocations but only one active allocation. |
| FeePayment | payment_id, student_id, amount_due, amount_paid, payment_date, balance/status | References Student; supports payment history. |
| Complaint | complaint_id, student_id, category, description, status, remarks, timestamps | At most one open complaint per student/category. |
| LeaveRequest | leave_id, student_id, start_date, end_date, reason, status | Admin decision changes Pending to Approved/Rejected. |
| Visitor | visitor_id, student_id, name, contact, purpose, entry_time, exit_time | References the student being visited. |

#### Module-to-Entity Mapping

| **Module** | **Primary Entities** |
|----|----|
| Authentication & Student | User, Student |
| Room & Allocation | Student, Room, Allocation |
| Fee | Student, FeePayment |
| Complaint | Student, Complaint |
| Admin Services | Student, LeaveRequest, Visitor, Room, FeePayment, Complaint |
| Reports | Student, Room, Allocation, FeePayment, Complaint, LeaveRequest, Visitor |

#### Transaction Boundaries

- Allocation: validate student and room state, create/update allocation,
  and update room occupancy as one logical transaction.

- Reallocation: validate destination room, release the previous
  allocation/occupancy, and establish the new allocation consistently.

- Vacating: mark the allocation inactive and release the room occupancy
  together.

- Fee payment: validate amount, persist payment, and update/recalculate
  the outstanding balance consistently.

- Complaint update: persist status and remarks together so the history
  shown to the student matches the administrative action.

### 3.b.6 Other Design Sections

#### User Interface Design Principles

- Use separate role-appropriate dashboards for Student and Warden/Admin
  users.

- Clearly mark mandatory fields and show validation messages close to
  the relevant form input.

- Use simple status labels such as Paid, Partially Paid, Due, Pending,
  Approved, Rejected, Open, In Progress, and Resolved.

- Require confirmation before critical operations such as vacating a
  room.

- Do not expose administrative controls in the student interface;
  server-side authorization remains mandatory even when UI controls are
  hidden.

#### Reporting Design

Reports are generated from the same persistent records used by the
dashboards so that exported values remain consistent with the
application's current state. CSV export is suitable for structured data
processing, while PDF export is intended for readable administrative
records. Report generation is restricted to authorized admin users.

#### Logging and Audit Considerations

The implementation should record operational events that are useful for
troubleshooting and accountability, such as authentication failures,
room allocation changes, fee updates, complaint status changes, leave
decisions, and visitor entry/exit updates. Logs should avoid storing
passwords or unnecessary sensitive personal data.

#### Design Constraints and Assumptions

- The final technology stack and selected relational database are
  determined by the team's implementation environment.

- The browser communicates with the application server through HTTPS and
  JSON-based REST requests.

- The application server and database are assumed to be available during
  normal operation.

- Optional email/SMS notification functionality depends on the selected
  external provider.

- The architecture does not claim that the NFR-001 200-concurrent-user
  target has been experimentally verified; such verification requires
  appropriate load-testing infrastructure.

## References

- Hostel Management System — Software Requirements Specification,
  Version 1.0, Team 3, 06 September 2026.

- Hostel Management System — Test Plan, Team 3, prepared with reference
  to SRS v1.0.

- IEEE 830-style SRS template/instructions supplied for the Software
  Engineering course.
