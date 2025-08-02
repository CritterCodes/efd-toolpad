"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";

const AppointmentsPage = () => {
  const { data: session, status } = useSession();
  const [appointments, setAppointments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (status === "authenticated") {
        try {
          const response = await fetch(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            {
              headers: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }
          );
          if (!response.ok) throw new Error("Failed to fetch appointments");
          const data = await response.json();
          setAppointments(data.items || []);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchAppointments();
  }, [session, status]);

  const filteredAppointments = appointments.filter((appointment) => {
    const searchString = `${appointment.summary || ""} ${
      appointment.description || ""
    }`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const upcomingAppointments = filteredAppointments.filter((appointment) => {
    const startDate = new Date(
      appointment.start?.dateTime || appointment.start?.date
    );
    return startDate >= new Date();
  });

  const pastAppointments = filteredAppointments.filter((appointment) => {
    const startDate = new Date(
      appointment.start?.dateTime || appointment.start?.date
    );
    return startDate < new Date();
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Appointments
      </Typography>

      {/* Search Field */}
      <TextField
        fullWidth
        label="Search Appointments"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        margin="normal"
      />

      {/* Upcoming Appointments */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Upcoming Appointments
        </Typography>
        <Grid container spacing={2}>
          {upcomingAppointments.length > 0 ? (
            upcomingAppointments.map((appointment) => (
              <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">
                      {appointment.summary || "No Title"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {formatDate(
                        appointment.start?.dateTime || appointment.start?.date
                      )}
                    </Typography>
                    <Typography variant="body2">
                      {appointment.description || "No Description"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography>No upcoming appointments found.</Typography>
          )}
        </Grid>
      </Box>

      {/* Past Appointments */}
      <Box mt={6}>
        <Typography variant="h5" gutterBottom>
          Past Appointments
        </Typography>
        <Grid container spacing={2}>
          {pastAppointments.length > 0 ? (
            pastAppointments.map((appointment) => (
              <Grid item xs={12} sm={6} md={4} key={appointment.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">
                      {appointment.summary || "No Title"}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {formatDate(
                        appointment.start?.dateTime || appointment.start?.date
                      )}
                    </Typography>
                    <Typography variant="body2">
                      {appointment.description || "No Description"}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Typography>No past appointments found.</Typography>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default AppointmentsPage;
