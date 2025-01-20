import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const getOAuth2Client = () => {
    const oAuth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    return oAuth2Client;
};

export const getGoogleCalendarEvents = async (accessToken) => {
    const auth = getOAuth2Client();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.events.list({
        calendarId: 'primary', // Use 'primary' for the main calendar
        timeMin: new Date().toISOString(), // Get events starting now
        maxResults: 10, // Limit results
        singleEvents: true,
        orderBy: 'startTime',
    });

    return response.data.items;
};
