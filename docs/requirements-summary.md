# Requirements Summary

This project is a serverless, event-driven Order Management System built on AWS.

## Core Capabilities

- Manage orders through REST APIs (create, read, update, delete)
- Persist all order data in the backend
- Provide a web-based client that communicates only via APIs

## Order Deletion Behavior

- Deleting an order is a single user action
- The system responds immediately after deletion
- Additional processes triggered by deletion must run asynchronously:
  - Email notifications to subscribed users
  - Backup of deleted order data in object storage

## Notifications

- Users can subscribe and unsubscribe to email notifications
- Notifications are sent automatically when an order is deleted
- Notifications must not block or delay order deletion

## Deleted Orders Reporting

- Each deleted order is saved as a text file in object storage
- A dedicated API generates a PDF summary of all deleted orders
- The API returns a download URL for the generated PDF

## Architecture Constraints

- Entire solution must be serverless
- System must be event-driven and scalable
- Business logic must live in AWS services, not in the client

## Client

- Web-based client (HTML, CSS, JavaScript)
- Client only calls APIs and displays results
- Hosted on AWS Amplify
