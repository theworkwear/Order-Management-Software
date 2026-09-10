# Google Sheets and Drive integration

## Short explanation

The Work Wear application uses a **Google service account** so its backend can access one Google Sheet and its related Google Drive folders without asking a human to sign in to Google every time.

The service account is a non-human Google identity owned by the application:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` identifies which service account the backend acts as.
- `GOOGLE_PRIVATE_KEY` is the secret cryptographic key that proves the backend is allowed to act as that service account.
- The `googleapis` library uses both values to sign a JWT, exchange it for a short-lived Google access token, and call the Google Sheets and Drive APIs.

The private key is not the spreadsheet password and is not sent to the browser. Google Sheets and Drive still need to be explicitly shared with the service-account email. The API scopes say what type of operation the application is requesting; the file's sharing permissions decide which specific resources it may access.

## What system this project uses

This is a Next.js server application using the Node.js `googleapis` package:

```text
Authenticated application user
           |
           v
Next.js server API route
           |
           | service-account email + private key
           v
Google authentication -> short-lived access token
           |
           +--> Google Sheets API v4
           |      - read orders and cell hyperlinks
           |      - create order rows
           |      - update order fields and statuses
           |
           +--> Google Drive API v3
                  - list artwork and digitized files
                  - display/download files through the backend
                  - upload digitized files
```

Google Sheets is the application's order-data source of truth. `GOOGLE_SPREADSHEET_ID` selects the spreadsheet and `GOOGLE_SHEET_NAME` selects its tab. The backend reads rows from that tab, converts them to application order objects, and writes order changes back to the same tab.

Google Drive folder links are stored in the spreadsheet. The backend extracts a folder ID from each link, lists the folder's files, proxies file content to signed-in application users, and uploads completed digitized files.

The Google credentials remain on the server. Browser components call this application's `/api/...` endpoints; they do not receive the private key or directly authenticate as the service account.

## Why both the email and private key are required

### Service-account email

Example format:

```text
work-wear-automation@my-google-project.iam.gserviceaccount.com
```

This is the account identifier. It has two jobs:

1. It tells Google which service account is requesting a token.
2. It is the address added to a Sheet, folder, or Shared Drive's sharing settings.

The email is an identity, not a password. Knowing it alone does not let someone access the files.

### Private key

Example shape only:

```text
-----BEGIN PRIVATE KEY-----
...
-----END PRIVATE KEY-----
```

The private key is the secret half of a public/private key pair. The server uses it to sign a JWT. Google verifies that signature using the public key registered for the service account, then issues a short-lived access token.

Anyone who obtains this private key can impersonate the service account and access every resource shared with it. Treat it like a production password: keep it only in server-side secret storage, never prefix it with `NEXT_PUBLIC_`, never send it to a browser, never log it, and never commit it to Git.

## Configuration used by this project

```dotenv
# The spreadsheet file ID from its Google Sheets URL
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here

# The exact tab title inside the spreadsheet
GOOGLE_SHEET_NAME=Sheet1

# Values copied from client_email and private_key in a service-account JSON key
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@project-id.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
```

In a deployment dashboard such as Vercel, the key may be stored on one line with literal `\n` characters. The application converts those sequences back into real line breaks before creating the Google JWT client.

The code also supports `GOOGLE_CREDENTIALS_JSON` as an alternative. That variable contains the complete service-account JSON document. Use either the complete JSON variable or the email/private-key pair; do not maintain two independent copies unless there is a deliberate fallback plan.

## Permissions and scopes

The ordinary Sheets integration requests:

```text
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive.readonly
```

- `spreadsheets` is needed because the app both reads and edits order rows.
- `drive.readonly` is needed to list and download artwork/digitized files and to read Drive-backed hyperlink information.

The upload endpoint currently requests broader Drive access:

```text
https://www.googleapis.com/auth/drive
https://www.googleapis.com/auth/drive.file
```

It needs write access because it calls `drive.files.create`. In the new system, use the narrowest scope that actually supports the selected file workflow. A scope does not automatically grant access to every file: the service account must also have permission on the target resource.

## How to set this up in another system

1. Create or select a Google Cloud project.
2. Enable the **Google Sheets API** and **Google Drive API**.
3. Create a dedicated service account for the new system. Do not reuse this system's identity or private key unless both applications intentionally need the same security boundary.
4. Create a JSON key only if the deployment platform cannot use a safer keyless option such as an attached service account or Workload Identity Federation.
5. Copy `client_email` from the downloaded JSON into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
6. Copy `private_key` into the deployment platform's server-side secret store as `GOOGLE_PRIVATE_KEY`. Preserve the PEM header, footer, and line breaks.
7. Share the required Google Sheet with the service-account email. Grant **Editor** because this application creates and updates order rows; Viewer is sufficient for a read-only replacement.
8. Share the required Drive folders or add the service account as a member of the Shared Drive. Grant only the level required by the new system.
9. Put the spreadsheet ID and exact sheet-tab name in the new system's environment configuration.
10. On the server, use Google's official client library to create a JWT client and then create Sheets/Drive clients from it.
11. Test one read and one permitted write. Also verify that an unshared file cannot be accessed.

Minimal Node.js example:

```ts
import { google } from 'googleapis';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });
```

Run this code only in a trusted backend/server context.

## Service account versus Google user OAuth

They are separate authentication models:

| Service account | Google user OAuth |
| --- | --- |
| The application acts as a non-human account. | The application acts on behalf of a signed-in Google user. |
| No Google consent screen is required on each run. | The user signs in and grants consent. |
| Best for a fixed company-owned Sheet and unattended backend jobs. | Best when every user connects their own Sheets/Drive files. |
| Access is controlled by sharing resources with the service-account email. | Access follows the signed-in user's permissions and granted scopes. |
| Uses a service-account email and private key, or a keyless workload identity. | Uses a client ID/client secret plus access and refresh tokens. |

This project supports both. In the Sheets code, a Google OAuth access token from the signed-in session takes priority when one is present. Otherwise it falls back to service-account credentials. The Drive list, download, invoice-image, and upload routes prefer the configured service account. For a predictable replacement system, choose one primary model instead of accidentally mixing identities.

Use a service account again if the new system operates on the same fixed organization-owned data regardless of which employee is signed in. Use Google user OAuth if different customers or employees need to connect different Google accounts and select their own files.

## Drive upload warning

Google service accounts do not have personal Drive storage quota and cannot own files. For reliable uploads, target a **Google Shared Drive** whose files belong to the organization, or upload on behalf of a human user with OAuth. Merely sharing a personal My Drive folder with a service account is appropriate for access to existing files but is not the recommended ownership model for new uploads.

## Security and migration checklist

- Create a different service account for each environment or independent application where practical.
- Store secrets in the host's encrypted secret/environment-variable system, not in source files.
- Keep `.env` and downloaded service-account JSON files out of Git.
- Give the service account access only to the required Sheet/folders or Shared Drive.
- Prefer `drive.file` or another narrower scope when the workflow permits it.
- Rotate keys and immediately disable/delete a key that may have leaked.
- Do not put service-account credentials in frontend code, mobile apps, or desktop binaries distributed to users.
- If hosted on Google Cloud, prefer an attached service account. If hosted outside Google Cloud, consider Workload Identity Federation to avoid a long-lived private key.
- Validate environment variables at startup and return a clear configuration error if credentials are absent.
- Centralize Google authentication in one server module so Sheets and Drive routes use the same parsing, scope, and identity rules.

## Relevant code in this repository

- `src/lib/google/sheets.ts`: authentication selection and all Sheets read/write operations.
- `src/app/api/drive/images/route.ts`: lists artwork and digitized files.
- `src/app/api/drive/file/route.ts`: securely streams a Drive file through the backend.
- `src/app/api/drive/upload/route.ts`: uploads a digitized file.
- `src/app/api/orders/[id]/invoice/route.ts`: reads Drive artwork for invoice generation.
- `src/app/api/auth/[...nextauth]/route.ts`: application login and optional Google user OAuth.
- `.env.example`: configuration variable template with placeholder values only.

## Official references

- [Google: Using OAuth 2.0 for server-to-server applications](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Google Workspace: Access files directly with a service account](https://developers.google.com/workspace/guides/create-credentials#access_google_workspace_files_with_a_service_account)
- [Google Sheets API scopes](https://developers.google.com/workspace/sheets/api/scopes)
- [Google Drive API scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Google: Service accounts overview](https://cloud.google.com/iam/docs/service-account-overview)
- [Google Drive: Shared drives and service-account storage](https://developers.google.com/workspace/drive/api/guides/about-shareddrives)
