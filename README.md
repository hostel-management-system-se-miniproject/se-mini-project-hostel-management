# Hostel Management System (HMS)

A Software Engineering mini-project by **Team 3, Class 5-J, PES University, Bangalore**.

HMS replaces register- and spreadsheet-based hostel record keeping with a centralized web application. Students can register, log in, view their room and fee status, raise complaints and request leave.

> **Important:** The submitted SRS, Software Architecture & Design Specification (SAD) and Test Plan are the baseline for implementation. Any deviation from them must be recorded in `docs/DEVIATIONS.md`.

*Last updated: 18 October 2026*

---

## Seed data for development and testing

The project includes a repeatable seed script for local development and demo testing.

- Run from the backend folder: `npm run seed`
- The script creates one admin account and 20 synthetic student accounts.
- This data is for test/demo use only and does not contain real student information.
- Passwords are stored as bcrypt hashes in MongoDB and are never committed as plaintext.

### Seeded test credentials

- Admin login: `admin@pes.edu` / `Admin@123`
- Student login pattern: `student001@pes.edu` to `student020@pes.edu` / `Pass@123`

These credentials are intended only for local testing and demo use. They are documented here so the test data remains explicit but not hidden in code.

### Seeded room mix

The seed script creates rooms across blocks A, B and C with mixed capacities and sharing types, including:

- an empty room (`A-102`),
- a full room (`A-101`),
- a room with exactly one free bed (`A-103`),
- and mixed single/double/triple/quad rooms across the hostel blocks.

### Deviation note

The room codes used in the seed script are consistent with the project’s room mix requirement and are suitable for demo and test flows. They are intentionally chosen to satisfy the acceptance criteria for HMS-26 and the Test Plan’s room conventions, while keeping the seeded room set realistic and repeatable.

---

## Table of Contents

1. [Team and Responsibilities](#1-team-and-responsibilities)
2. [Schedule](#2-schedule)
3. [Scope at a Glance](#3-scope-at-a-glance)
4. [Technology Stack](#4-technology-stack)
5. [Repository Structure](#5-repository-structure)
6. [Getting Started](#6-getting-started)
7. [Environment Variables](#7-environment-variables)
8. [Backlog and Project Board](#8-backlog-and-project-board)
9. [Git and GitHub Workflow](#9-git-and-github-workflow)
10. [Essential Git Commands](#10-essential-git-commands)
11. [Definition of Done](#11-definition-of-done)
12. [Testing](#12-testing)
13. [Deviations from the Submitted Documents](#13-deviations-from-the-submitted-documents)
14. [Sprint Demo Videos](#14-sprint-demo-videos)
15. [Security and Repository Hygiene](#15-security-and-repository-hygiene)
16. [Project Documentation](#16-project-documentation)

---
