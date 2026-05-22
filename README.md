# Lakeview Pilot

Current milestone: Airbnb calendar sync viewer.

## What the app does

- Lets a user paste an Airbnb iCal calendar URL.
- Fetches the iCal calendar through a Next.js API route.
- Parses the calendar events.
- Displays upcoming check-in and check-out dates.
- Shows the number of nights for each event.

## How to run locally

1. npm install
2. npm run dev
3. Open http://localhost:3000

## How to test

1. Go to the homepage.
2. Paste an Airbnb exported iCal URL.
3. Click Sync calendar.
4. Confirm upcoming stays are displayed.

## Current limitations

- No database yet.
- No authentication yet.
- Calendar URL is not saved yet.
- Does not create cleaning jobs yet.
- iCal feed may include blocked dates such as "Airbnb (Not available)", not only reservations.
