# Create account with verification — e264095

## Request
Add an option on the existing login experience to create an account with a username, password verification, and confirm-password check, on the same `e264095-user-database` branch.

## Implementation
Added a prototype sign-up flow with unique username checks, password rules, confirm-password verification, show/hide controls, and local browser storage for newly created demo accounts. The existing demo user remains available.

## Security note
Because this is a static university prototype, newly created accounts are stored in the browser's localStorage and are not written back to the repository JSON file. Real production authentication would require a backend and hashed passwords.
