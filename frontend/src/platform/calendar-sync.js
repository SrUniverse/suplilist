/**
 * Calendar Sync — Google Calendar integration for reminders
 * Syncs supplement reminders to user's calendar automatically
 */

import logger from './logger.js';

export class CalendarSync {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.discoveryUrl = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.scopes = 'https://www.googleapis.com/auth/calendar';
    this.isInitialized = false;
  }

  /**
   * Initialize Google Calendar API
   */
  async initialize() {
    try {
      // Load Google API library
      await this.loadGapiLibrary();
      gapi.client.init({
        clientId: this.clientId,
        scope: this.scopes,
        discoveryDocs: [this.discoveryUrl]
      });

      this.isInitialized = true;
      logger.info('Calendar sync initialized');
      return true;
    } catch (error) {
      logger.error('Calendar sync initialization failed', error);
      return false;
    }
  }

  /**
   * Load Google API library
   */
  loadGapiLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        gapi.load('client:auth2', resolve);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Request user permission and connect calendar
   */
  async connectCalendar() {
    try {
      const auth = gapi.auth2.getAuthInstance();
      const user = await auth.signIn();

      if (user.isSignedIn()) {
        logger.info('User connected Google Calendar');
        return {
          success: true,
          email: user.getBasicProfile().getEmail()
        };
      }
    } catch (error) {
      logger.error('Calendar connection failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync supplement reminders to calendar
   */
  async syncReminders(reminders) {
    if (!this.isInitialized) {
      logger.error('Calendar not initialized');
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    for (const reminder of reminders) {
      try {
        const eventId = await this.createOrUpdateEvent(reminder);
        if (eventId) {
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        logger.error(`Failed to sync reminder: ${reminder.supplementName}`, error);
        failed++;
      }
    }

    return { synced, failed };
  }

  /**
   * Create or update calendar event
   */
  async createOrUpdateEvent(reminder) {
    const event = this.buildCalendarEvent(reminder);

    try {
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      });

      logger.info(`Calendar event created: ${reminder.supplementName}`);
      return response.result.id;
    } catch (error) {
      logger.error(`Failed to create calendar event: ${reminder.supplementName}`, error);
      return null;
    }
  }

  /**
   * Build calendar event object
   */
  buildCalendarEvent(reminder) {
    const now = new Date();
    const startTime = new Date();
    startTime.setHours(reminder.hour, reminder.minute, 0);

    // Make event recurring daily
    return {
      summary: `Tomar ${reminder.supplementName}`,
      description: `Lembrete diário para tomar ${reminder.supplementName}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: new Date(startTime.getTime() + 30 * 60000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      recurrence: ['RRULE:FREQ=DAILY'],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'notification', minutes: 0 },
          { method: 'email', minutes: 1440 } // Email 1 day before
        ]
      },
      transparency: 'transparent'
    };
  }

  /**
   * Disconnect calendar
   */
  async disconnectCalendar() {
    try {
      const auth = gapi.auth2.getAuthInstance();
      await auth.signOut();
      this.isInitialized = false;
      logger.info('Calendar disconnected');
      return true;
    } catch (error) {
      logger.error('Failed to disconnect calendar', error);
      return false;
    }
  }

  /**
   * Get calendar status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      connected: this.isInitialized && gapi.auth2.getAuthInstance()?.isSignedIn?.get()
    };
  }
}

export default new CalendarSync();
