import json
import os
import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .base_calendar import BaseCalendarClient


class GoogleCalendarClient(BaseCalendarClient):

    def __init__(self):
        creds = None
        SCOPES           = ["https://www.googleapis.com/auth/calendar"]
        CREDENTIALS_FILE = "app/clients/calendar/credentials.json"

        if os.path.exists("token.json"):
            creds = Credentials.from_authorized_user_file("token.json", SCOPES)

        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow  = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
                creds = flow.run_local_server(port=0)
            with open("token.json", "w") as token:
                token.write(creds.to_json())

        self.service = build("calendar", "v3", credentials=creds)

    def get_events(self, start_time=None, end_time=None):
        now = datetime.datetime.utcnow().isoformat() + "Z"
        result = (
            self.service.events()
            .list(calendarId="primary", timeMin=now, maxResults=10,
                  singleEvents=True, orderBy="startTime")
            .execute()
        )
        for event in result.get("items", []):
            start = event["start"].get("dateTime", event["start"].get("date"))
            print(start, event["summary"])

    def create_event(self, meeting):
        timezone = getattr(meeting, "timezone", None) or "UTC"

        # Fallback: build datetime from date + time if ISO fields empty
        start_dt = getattr(meeting, "start_datetime", "") or ""
        if not start_dt and meeting.date and meeting.time:
            start_dt = f"{meeting.date}T{meeting.time}:00"

        end_dt = getattr(meeting, "end_datetime", "") or ""
        if not end_dt and start_dt:
            base   = datetime.datetime.fromisoformat(start_dt)
            end_dt = (base + datetime.timedelta(minutes=getattr(meeting, "duration", 30) or 30)).isoformat()

        # Attendees from comma-separated participants string
        attendees = []
        for email in (getattr(meeting, "participants", "") or "").split(","):
            email = email.strip()
            if email:
                attendees.append({"email": email})

        # Reminders — always useDefault (per product decision)
        reminders = {"useDefault": True, "overrides": []}

        event = {
            "summary":     meeting.title,
            "description": getattr(meeting, "description", "") or "",
            "start":       {"dateTime": start_dt, "timeZone": timezone},
            "end":         {"dateTime": end_dt,   "timeZone": timezone},
            "attendees":   attendees,
            "reminders":   reminders,
        }

        try:
            created = (
                self.service.events()
                .insert(calendarId="primary", body=event, sendUpdates="all")
                .execute()
            )
            print(f"Event created: {created.get('htmlLink')}")
            return created
        except HttpError as error:
            print(f"Google Calendar API error: {error}")
            return None

    def delete_event(self, event_id: str):
        try:
            self.service.events().delete(calendarId="primary", eventId=event_id).execute()
            print(f"Event {event_id} deleted.")
        except HttpError as error:
            print(f"Google Calendar API error: {error}")