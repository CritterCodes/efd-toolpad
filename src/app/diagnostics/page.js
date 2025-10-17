"use client";"use client";"use client";'use client';'use client';'use client';'use client';'use client';



import React from 'react';

import { Box, Typography } from '@mui/material';

import React, { useState, useEffect } from 'react';import { useEffect } from 'react';

export default function DiagnosticsPage() {

  return (import { useSession } from 'next-auth/react';

    <Box p={3}>

      <Typography variant="h4" gutterBottom>import {import { useSession } from 'next-auth/react';

        🔍 Artisan Application Diagnostics

      </Typography>  Box,

      <Typography variant="body1">

        Diagnostic system is deployed and working. This page shows failed artisan application submissions for analysis.  Typography,import { Box, CircularProgress, Typography } from '@mui/material';

      </Typography>

    </Box>  CircularProgress,

  );

}  Alert,import React, { useState, useEffect } from 'react';

  Paper,

  Table,export default function DiagnosticsPage() {

  TableBody,

  TableCell,    const { data: session, status } = useSession();import { useSession } from 'next-auth/react';

  TableContainer,

  TableHead,

  TableRow,

  Chip,    if (status === 'loading') {import { Box, Typography, CircularProgress, Alert } from '@mui/material';import { useState, useEffect } from 'react';

  Button,

  Card,        return (

  CardContent,

  Grid            <Box import { getEffectiveRole } from '@/lib/roleBasedNavigation';

} from '@mui/material';

import { getEffectiveRole } from '@/lib/roleBasedNavigation';                sx={{ 



export default function DiagnosticsPage() {                    display: 'flex', import { useSession } from 'next-auth/react';

  const { data: session, status } = useSession();

  const [effectiveRole, setEffectiveRole] = useState(null);                    flexDirection: 'column',

  const [diagnostics, setDiagnostics] = useState([]);

  const [loading, setLoading] = useState(false);                    justifyContent: 'center', export default function DiagnosticsPage() {

  const [stats, setStats] = useState({});

                    alignItems: 'center', 

  useEffect(() => {

    if (session?.user) {                    minHeight: '100vh'   const { data: session, status } = useSession();import { import { useState, useEffect } from 'react';

      const role = getEffectiveRole(session.user);

      setEffectiveRole(role);                }}

    }

  }, [session]);            >  const [effectiveRole, setEffectiveRole] = useState(null);



  useEffect(() => {                <CircularProgress />

    if (effectiveRole && ['admin', 'staff', 'dev'].includes(effectiveRole)) {

      fetchDiagnostics();                <Typography variant="h6" sx={{ mt: 2 }}>  Box, 

    }

  }, [effectiveRole]);                    Loading...



  const fetchDiagnostics = async () => {                </Typography>  useEffect(() => {

    setLoading(true);

    try {            </Box>

      const response = await fetch('/api/diagnostics');

      if (response.ok) {        );    if (session?.user) {  Typography, import { useSession } from 'next-auth/react';

        const data = await response.json();

        setDiagnostics(data.diagnostics || []);    }

        setStats(data.stats || {});

      }      const role = getEffectiveRole(session.user);

    } catch (error) {

      console.error('Failed to fetch diagnostics:', error);    if (!session) {

    } finally {

      setLoading(false);        return (      setEffectiveRole(role);  CircularProgress, 

    }

  };            <Box p={3}>



  if (status === 'loading') {                <Typography variant="h4">Access Denied</Typography>    }

    return (

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">                <Typography>Please log in to access diagnostics.</Typography>

        <CircularProgress />

      </Box>            </Box>  }, [session]);  Alert import { Box, Typography, CircularProgress, Alert } from '@mui/material';import React, { useState, useEffect, useCallback } from 'react';import React, { useState, useEffect, useCallback } from 'react';

    );

  }        );



  if (!session?.user) {    }

    return (

      <Box p={3}>

        <Alert severity="error">Please log in to access diagnostics.</Alert>

      </Box>    return (  if (status === 'loading') {} from '@mui/material';

    );

  }        <Box p={3}>



  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {            <Typography variant="h4" gutterBottom>    return (

    return (

      <Box p={3}>                Artisan Application Diagnostics

        <Alert severity="warning">You do not have permission to access diagnostics.</Alert>

      </Box>            </Typography>      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">import { getEffectiveRole } from '@/lib/roleBasedNavigation';import { getEffectiveRole } from '@/lib/roleBasedNavigation';

    );

  }            <Typography variant="body1">



  return (                Diagnostic system is ready. This page will show failed artisan application submissions for analysis.        <CircularProgress />

    <Box p={3}>

      <Typography variant="h4" gutterBottom>            </Typography>

        🔍 Artisan Application Diagnostics

      </Typography>        </Box>      </Box>

      

      <Grid container spacing={3} sx={{ mb: 3 }}>    );

        <Grid item xs={12} sm={6} md={3}>

          <Card>}    );

            <CardContent>

              <Typography variant="h6">Total Issues</Typography>  }export default function DiagnosticsPage() {import { useSession } from 'next-auth/react';import { useSession } from 'next-auth/react';

              <Typography variant="h4">{stats.total || 0}</Typography>

            </CardContent>

          </Card>

        </Grid>  if (!session?.user) {  const { data: session, status } = useSession();

        <Grid item xs={12} sm={6} md={3}>

          <Card>    return (

            <CardContent>

              <Typography variant="h6">Today</Typography>      <Box p={3}>  const [effectiveRole, setEffectiveRole] = useState(null);export default function DiagnosticsPage() {

              <Typography variant="h4">{stats.today || 0}</Typography>

            </CardContent>        <Alert severity="error">Please log in to access diagnostics.</Alert>

          </Card>

        </Grid>      </Box>

        <Grid item xs={12} sm={6} md={3}>

          <Card>    );

            <CardContent>

              <Typography variant="h6">This Week</Typography>  }  useEffect(() => {  const { data: session, status } = useSession();import { import { 

              <Typography variant="h4">{stats.week || 0}</Typography>

            </CardContent>

          </Card>

        </Grid>  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {    if (session?.user) {

        <Grid item xs={12} sm={6} md={3}>

          <Card>    return (

            <CardContent>

              <Typography variant="h6">Resolved</Typography>      <Box p={3}>      const role = getEffectiveRole(session.user);  const [effectiveRole, setEffectiveRole] = useState(null);

              <Typography variant="h4">{stats.resolved || 0}</Typography>

            </CardContent>        <Alert severity="warning">You do not have permission to access diagnostics.</Alert>

          </Card>

        </Grid>      </Box>      setEffectiveRole(role);

      </Grid>

    );

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>

        <Typography variant="h6">Recent Diagnostic Reports</Typography>  }    }  Box,   Box, 

        <Button variant="outlined" onClick={fetchDiagnostics} disabled={loading}>

          {loading ? <CircularProgress size={20} /> : 'Refresh'}

        </Button>

      </Box>  return (  }, [session]);



      <TableContainer component={Paper}>    <Box p={3}>

        <Table>

          <TableHead>      <Typography variant="h4" gutterBottom>  useEffect(() => {

            <TableRow>

              <TableCell>Timestamp</TableCell>        Artisan Application Diagnostics

              <TableCell>User Email</TableCell>

              <TableCell>Error Type</TableCell>      </Typography>  if (status === 'loading') {

              <TableCell>Message</TableCell>

              <TableCell>Status</TableCell>      <Typography variant="body1">

            </TableRow>

          </TableHead>        Diagnostic system is being deployed. This page will show failed artisan application submissions for analysis.    return (    if (session?.user) {  Typography,   Typography, 

          <TableBody>

            {diagnostics.length === 0 ? (      </Typography>

              <TableRow>

                <TableCell colSpan={5} align="center">    </Box>      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">

                  <Typography variant="body2" color="text.secondary">

                    No diagnostic reports found  );

                  </Typography>

                </TableCell>}        <CircularProgress />      const role = getEffectiveRole(session.user);

              </TableRow>

            ) : (      </Box>

              diagnostics.map((diagnostic, index) => (

                <TableRow key={diagnostic._id || index}>    );      setEffectiveRole(role);  Card,   Card, 

                  <TableCell>

                    {new Date(diagnostic.timestamp).toLocaleString()}  }

                  </TableCell>

                  <TableCell>{diagnostic.userEmail}</TableCell>    }

                  <TableCell>

                    <Chip   if (!session?.user) {

                      label={diagnostic.errorType} 

                      color={diagnostic.errorType === 'network' ? 'error' : 'warning'}    return (  }, [session]);  CardContent,   CardContent, 

                      size="small"

                    />      <Box p={3}>

                  </TableCell>

                  <TableCell>{diagnostic.errorMessage}</TableCell>        <Alert severity="error">Please log in to access diagnostics.</Alert>

                  <TableCell>

                    <Chip       </Box>

                      label={diagnostic.resolved ? 'Resolved' : 'Open'} 

                      color={diagnostic.resolved ? 'success' : 'default'}    );  if (status === 'loading') {  Grid,   Grid, 

                      size="small"

                    />  }

                  </TableCell>

                </TableRow>    return (

              ))

            )}  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {

          </TableBody>

        </Table>    return (      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">  Chip,   Chip, 

      </TableContainer>

    </Box>      <Box p={3}>

  );

}        <Alert severity="warning">You do not have permission to access diagnostics.</Alert>        <CircularProgress />

      </Box>

    );      </Box>  Button,   Button, 

  }

    );

  return (

    <Box p={3}>  }  Select,   Select, 

      <Typography variant="h4" gutterBottom>

        Artisan Application Diagnostics

      </Typography>

      <Typography variant="body1">  if (!session?.user) {  MenuItem,   MenuItem, 

        Diagnostic system is being deployed. This page will show failed artisan application submissions for analysis.

      </Typography>    return (

    </Box>

  );      <Box p={3}>  FormControl,   FormControl, 

}
        <Alert severity="error">Please log in to access diagnostics.</Alert>

      </Box>  InputLabel,   InputLabel, 

    );

  }  TextField,  TextField,



  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {  CircularProgress,  CircularProgress,

    return (

      <Box p={3}>  Alert,  Alert,

        <Alert severity="warning">You don&apos;t have permission to access diagnostics.</Alert>

      </Box>  Paper,  Paper,

    );

  }  List,  List,



  return (  ListItem,  ListItem,

    <Box p={3}>

      <Typography variant="h4" gutterBottom>  ListItemText,  ListItemText,

        🔍 Artisan Application Diagnostics

      </Typography>  Divider  Divider

      <Typography variant="body1">

        Diagnostic system is being deployed. This page will show failed artisan application submissions for analysis.} from '@mui/material';} from '@mui/material';

      </Typography>

    </Box>import { getEffectiveRole } from '@/lib/roleBasedNavigation';import { getEffectiveRole } from '@/lib/roleBasedNavigation';

  );

}

export default function DiagnosticsAdminPage() {export default function DiagnosticsAdminPage() {

  const { data: session, status } = useSession();  const { data: session, status } = useSession();

  const [diagnostics, setDiagnostics] = useState([]);  const [diagnostics, setDiagnostics] = useState([]);

  const [loading, setLoading] = useState(true);  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState({  const [filter, setFilter] = useState({

    errorType: '',    errorType: '',

    resolved: '',    resolved: '',

    userId: ''    userId: ''

  });  });

  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);  const [selectedDiagnostic, setSelectedDiagnostic] = useState(null);

  const [stats, setStats] = useState([]);  const [stats, setStats] = useState([]);

  const [effectiveRole, setEffectiveRole] = useState(null);  const [effectiveRole, setEffectiveRole] = useState(null);



  useEffect(() => {  useEffect(() => {

    if (session?.user) {    if (session?.user) {

      const role = getEffectiveRole(session.user);      const role = getEffectiveRole(session.user);

      setEffectiveRole(role);      setEffectiveRole(role);

    }    }

  }, [session]);  }, [session]);



  const fetchDiagnostics = useCallback(async () => {  useEffect(() => {

    try {    if (effectiveRole) {

      setLoading(true);      fetchDiagnostics();

      const params = new URLSearchParams();    }

        }, [effectiveRole, fetchDiagnostics]);

      if (filter.errorType) params.append('errorType', filter.errorType);

      if (filter.resolved !== '') params.append('resolved', filter.resolved);  const fetchDiagnostics = useCallback(async () => {

      if (filter.userId) params.append('userId', filter.userId);    try {

      setLoading(true);

      const response = await fetch(`/api/diagnostics?${params}`);      const params = new URLSearchParams();

      const data = await response.json();      

            if (filter.errorType) params.append('errorType', filter.errorType);

      setDiagnostics(data.diagnostics || []);      if (filter.resolved !== '') params.append('resolved', filter.resolved);

      setStats(data.statistics || []);      if (filter.userId) params.append('userId', filter.userId);

    } catch (error) {

      console.error('Failed to fetch diagnostics:', error);      const response = await fetch(`/api/diagnostics?${params}`);

    } finally {      const data = await response.json();

      setLoading(false);      

    }      setDiagnostics(data.diagnostics || []);

  }, [filter]);      setStats(data.statistics || []);

    } catch (error) {

  useEffect(() => {      console.error('Failed to fetch diagnostics:', error);

    if (effectiveRole) {    } finally {

      fetchDiagnostics();      setLoading(false);

    }    }

  }, [effectiveRole, fetchDiagnostics]);  }, [filter]);



  const updateDiagnostic = async (diagnosticId, updates) => {  const updateDiagnostic = async (diagnosticId, updates) => {

    try {    try {

      const response = await fetch('/api/diagnostics', {      const response = await fetch('/api/diagnostics', {

        method: 'PATCH',        method: 'PATCH',

        headers: {        headers: {

          'Content-Type': 'application/json'          'Content-Type': 'application/json'

        },        },

        body: JSON.stringify({        body: JSON.stringify({

          diagnosticId,          diagnosticId,

          ...updates          ...updates

        })        })

      });      });



      if (response.ok) {      if (response.ok) {

        fetchDiagnostics();        fetchDiagnostics(); // Refresh the list

        if (selectedDiagnostic?._id === diagnosticId) {        if (selectedDiagnostic?._id === diagnosticId) {

          setSelectedDiagnostic({ ...selectedDiagnostic, ...updates });          setSelectedDiagnostic({ ...selectedDiagnostic, ...updates });

        }        }

      }      }

    } catch (error) {    } catch (error) {

      console.error('Failed to update diagnostic:', error);      console.error('Failed to update diagnostic:', error);

    }    }

  };  };



  const getErrorTypeColor = (errorType) => {  const getErrorTypeColor = (errorType) => {

    switch (errorType) {    switch (errorType) {

      case 'authentication': return 'error';      case 'authentication': return 'error';

      case 'validation': return 'warning';      case 'validation': return 'warning';

      case 'server-error': return 'primary';      case 'server-error': return 'primary';

      case 'network': return 'info';      case 'network': return 'info';

      default: return 'default';      default: return 'default';

    }    }

  };  };



  if (status === 'loading') {  // Authentication check

    return (  if (status === 'loading') {

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">    return (

        <CircularProgress />      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">

      </Box>        <CircularProgress />

    );      </Box>

  }    );

  }

  if (!session?.user) {

    return (  if (!session?.user) {

      <Box p={3}>    return (

        <Alert severity="error">Please log in to access diagnostics.</Alert>      <Box p={3}>

      </Box>        <Alert severity="error">Please log in to access diagnostics.</Alert>

    );      </Box>

  }    );

  }

  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {

    return (  // Role check

      <Box p={3}>  if (!['admin', 'staff', 'dev'].includes(effectiveRole)) {

        <Alert severity="warning">You don&apos;t have permission to access diagnostics.</Alert>    return (

      </Box>      <Box p={3}>

    );        <Alert severity="warning">You don&apos;t have permission to access diagnostics.</Alert>

  }      </Box>

    );

  if (loading) {  }

    return (

      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">  if (loading) {

        <CircularProgress />    return (

        <Typography variant="h6" sx={{ ml: 2 }}>Loading diagnostics...</Typography>      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">

      </Box>        <CircularProgress />

    );        <Typography variant="h6" sx={{ ml: 2 }}>Loading diagnostics...</Typography>

  }      </Box>

    );

  return (  }

    <Box p={3}>

      <Typography variant="h4" gutterBottom>  return (

        🔍 Artisan Application Diagnostics    <Box p={3}>

      </Typography>      <Typography variant="h4" gutterBottom>

              🔍 Artisan Application Diagnostics

      {/* Statistics */}      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>      

        {stats.map((stat) => (      {/* Statistics */}

          <Grid item xs={12} sm={6} md={3} key={stat._id}>      <Grid container spacing={3} sx={{ mb: 3 }}>

            <Card>        {stats.map((stat) => (

              <CardContent>          <Grid item xs={12} sm={6} md={3} key={stat._id}>

                <Typography variant="h6" component="div">            <Card>

                  {stat._id}              <CardContent>

                </Typography>                <Typography variant="h6" component="div">

                <Typography variant="h4" color="primary">                  {stat._id}

                  {stat.count}                </Typography>

                </Typography>                <Typography variant="h4" color="primary">

                <Typography variant="body2" color="text.secondary">                  {stat.count}

                  {stat.resolved} resolved                </Typography>

                </Typography>                <Typography variant="body2" color="text.secondary">

              </CardContent>                  {stat.resolved} resolved

            </Card>                </Typography>

          </Grid>              </CardContent>

        ))}            </Card>

      </Grid>          </Grid>

        ))}

      {/* Filters */}      </Grid>

      <Card sx={{ mb: 3 }}>

        <CardContent>      {/* Filters */}

          <Grid container spacing={3}>      <Card sx={{ mb: 3 }}>

            <Grid item xs={12} md={4}>        <CardContent>

              <FormControl fullWidth>          <Grid container spacing={3}>

                <InputLabel>Error Type</InputLabel>            <Grid item xs={12} md={4}>

                <Select              <FormControl fullWidth>

                  value={filter.errorType}                <InputLabel>Error Type</InputLabel>

                  label="Error Type"                <Select

                  onChange={(e) => setFilter({ ...filter, errorType: e.target.value })}                  value={filter.errorType}

                >                  label="Error Type"

                  <MenuItem value="">All Types</MenuItem>                  onChange={(e) => setFilter({ ...filter, errorType: e.target.value })}

                  <MenuItem value="authentication">Authentication</MenuItem>                >

                  <MenuItem value="validation">Validation</MenuItem>                  <MenuItem value="">All Types</MenuItem>

                  <MenuItem value="server-error">Server Error</MenuItem>                  <MenuItem value="authentication">Authentication</MenuItem>

                  <MenuItem value="network">Network</MenuItem>                  <MenuItem value="validation">Validation</MenuItem>

                  <MenuItem value="form-data-parsing">Form Data Parsing</MenuItem>                  <MenuItem value="server-error">Server Error</MenuItem>

                </Select>                  <MenuItem value="network">Network</MenuItem>

              </FormControl>                  <MenuItem value="form-data-parsing">Form Data Parsing</MenuItem>

            </Grid>                </Select>

                          </FormControl>

            <Grid item xs={12} md={4}>            </Grid>

              <FormControl fullWidth>            

                <InputLabel>Status</InputLabel>            <Grid item xs={12} md={4}>

                <Select              <FormControl fullWidth>

                  value={filter.resolved}                <InputLabel>Status</InputLabel>

                  label="Status"                <Select

                  onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}                  value={filter.resolved}

                >                  label="Status"

                  <MenuItem value="">All Status</MenuItem>                  onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}

                  <MenuItem value="true">Resolved</MenuItem>                >

                  <MenuItem value="false">Unresolved</MenuItem>                  <MenuItem value="">All Status</MenuItem>

                </Select>                  <MenuItem value="true">Resolved</MenuItem>

              </FormControl>                  <MenuItem value="false">Unresolved</MenuItem>

            </Grid>                </Select>

                          </FormControl>

            <Grid item xs={12} md={4}>            </Grid>

              <TextField            

                fullWidth            <Grid item xs={12} md={4}>

                label="User ID/Email"              <TextField

                value={filter.userId}                fullWidth

                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}                label="User ID/Email"

                placeholder="Search by user..."                value={filter.userId}

              />                onChange={(e) => setFilter({ ...filter, userId: e.target.value })}

            </Grid>                placeholder="Search by user..."

          </Grid>              />

        </CardContent>            </Grid>

      </Card>          </Grid>

        </CardContent>

      <Grid container spacing={3}>      </Card>

        {/* Diagnostics List */}

        <Grid item xs={12} lg={6}>      <Grid container spacing={3}>

          <Card>        {/* Diagnostics List */}

            <CardContent>        <Grid item xs={12} lg={6}>

              <Typography variant="h6" gutterBottom>          <Card>

                Diagnostics ({diagnostics.length})            <CardContent>

              </Typography>              <Typography variant="h6" gutterBottom>

                              Diagnostics ({diagnostics.length})

              <List sx={{ maxHeight: 600, overflow: 'auto' }}>              </Typography>

                {diagnostics.map((diagnostic, index) => (              

                  <React.Fragment key={diagnostic._id}>              <List sx={{ maxHeight: 600, overflow: 'auto' }}>

                    <ListItem                {diagnostics.map((diagnostic, index) => (

                      button                  <React.Fragment key={diagnostic._id}>

                      onClick={() => setSelectedDiagnostic(diagnostic)}                    <ListItem

                      selected={selectedDiagnostic?._id === diagnostic._id}                      button

                    >                      onClick={() => setSelectedDiagnostic(diagnostic)}

                      <ListItemText                      selected={selectedDiagnostic?._id === diagnostic._id}

                        primary={                    >

                          <Box display="flex" justifyContent="space-between" alignItems="center">                      <ListItemText

                            <Chip                         primary={

                              label={diagnostic.errorType}                           <Box display="flex" justifyContent="space-between" alignItems="center">

                              color={getErrorTypeColor(diagnostic.errorType)}                            <Chip 

                              size="small"                              label={diagnostic.errorType} 

                            />                              color={getErrorTypeColor(diagnostic.errorType)}

                            <Box                              size="small"

                              sx={{                            />

                                width: 8,                            <Box

                                height: 8,                              sx={{

                                borderRadius: '50%',                                width: 8,

                                backgroundColor: diagnostic.resolved ? 'success.main' : 'error.main'                                height: 8,

                              }}                                borderRadius: '50%',

                            />                                backgroundColor: diagnostic.resolved ? 'success.main' : 'error.main'

                          </Box>                              }}

                        }                            />

                        secondary={                          </Box>

                          <Box>                        }

                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>                        secondary={

                              {diagnostic.error.message}                          <Box>

                            </Typography>                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>

                            <Typography variant="caption" color="text.secondary">                              {diagnostic.error.message}

                              User: {diagnostic.user.email || 'Unknown'}<br/>                            </Typography>

                              Time: {new Date(diagnostic.timestamp).toLocaleString()}                            <Typography variant="caption" color="text.secondary">

                            </Typography>                              User: {diagnostic.user.email || 'Unknown'}<br/>

                          </Box>                              Time: {new Date(diagnostic.timestamp).toLocaleString()}

                        }                            </Typography>

                      />                          </Box>

                    </ListItem>                        }

                    {index < diagnostics.length - 1 && <Divider />}                      />

                  </React.Fragment>                    </ListItem>

                ))}                    {index < diagnostics.length - 1 && <Divider />}

              </List>                  </React.Fragment>

            </CardContent>                ))}

          </Card>              </List>

        </Grid>            </CardContent>

          </Card>

        {/* Diagnostic Details */}        </Grid>

        <Grid item xs={12} lg={6}>

          <Card>        {/* Diagnostic Details */}

            <CardContent>        <Grid item xs={12} lg={6}>

              <Typography variant="h6" gutterBottom>          <Card>

                Diagnostic Details            <CardContent>

              </Typography>              <Typography variant="h6" gutterBottom>

                              Diagnostic Details

              {selectedDiagnostic ? (              </Typography>

                <Box>              

                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>              {selectedDiagnostic ? (

                    <Chip                 <Box>

                      label={selectedDiagnostic.errorType}                   {/* Header */}

                      color={getErrorTypeColor(selectedDiagnostic.errorType)}                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>

                    />                    <Chip 

                                          label={selectedDiagnostic.errorType} 

                    <Button                      color={getErrorTypeColor(selectedDiagnostic.errorType)}

                      variant={selectedDiagnostic.resolved ? "outlined" : "contained"}                    />

                      color={selectedDiagnostic.resolved ? "warning" : "success"}                    

                      onClick={() => updateDiagnostic(selectedDiagnostic._id, { resolved: !selectedDiagnostic.resolved })}                    <Button

                    >                      variant={selectedDiagnostic.resolved ? "outlined" : "contained"}

                      {selectedDiagnostic.resolved ? 'Mark Unresolved' : 'Mark Resolved'}                      color={selectedDiagnostic.resolved ? "warning" : "success"}

                    </Button>                      onClick={() => updateDiagnostic(selectedDiagnostic._id, { resolved: !selectedDiagnostic.resolved })}

                  </Box>                    >

                      {selectedDiagnostic.resolved ? 'Mark Unresolved' : 'Mark Resolved'}

                  <Paper sx={{ p: 2, mb: 2 }}>                    </Button>

                    <Typography variant="subtitle1" gutterBottom>Error Details</Typography>                  </Box>

                    <Typography variant="body2">

                      <strong>Message:</strong> {selectedDiagnostic.error.message}<br/>                  {/* Error Info */}

                      <strong>Time:</strong> {new Date(selectedDiagnostic.timestamp).toLocaleString()}                  <Accordion>

                    </Typography>                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                  </Paper>                      <Typography variant="subtitle1">Error Details</Typography>

                    </AccordionSummary>

                  <Paper sx={{ p: 2, mb: 2 }}>                    <AccordionDetails>

                    <Typography variant="subtitle1" gutterBottom>User Information</Typography>                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>

                    <Typography variant="body2">                        <Typography variant="body2">

                      <strong>Email:</strong> {selectedDiagnostic.user.email || 'N/A'}<br/>                          <strong>Message:</strong> {selectedDiagnostic.error.message}<br/>

                      <strong>Mongo ID:</strong> {selectedDiagnostic.user.mongoUserId || 'N/A'}<br/>                          <strong>Time:</strong> {new Date(selectedDiagnostic.timestamp).toLocaleString()}

                      <strong>Shopify ID:</strong> {selectedDiagnostic.user.shopifyCustomerId || 'N/A'}<br/>                        </Typography>

                      <strong>Authenticated:</strong> {selectedDiagnostic.user.isAuthenticated ? '✅' : '❌'}                      </Paper>

                    </Typography>                    </AccordionDetails>

                  </Paper>                  </Accordion>



                  {selectedDiagnostic.formData?.fields && (                  {/* User Info */}

                    <Paper sx={{ p: 2, mb: 2 }}>                  <Accordion>

                      <Typography variant="subtitle1" gutterBottom>Form Data</Typography>                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                      <Typography variant="body2">                      <Typography variant="subtitle1">User Information</Typography>

                        <strong>Missing Required:</strong> {selectedDiagnostic.formData.missingRequiredFields?.join(', ') || 'None'}<br/>                    </AccordionSummary>

                        <strong>Files:</strong> {selectedDiagnostic.formData.fileCount || 0}<br/>                    <AccordionDetails>

                        <strong>Form Size:</strong> {(selectedDiagnostic.formData.formSize || 0)} bytes                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>

                      </Typography>                        <Typography variant="body2">

                    </Paper>                          <strong>Email:</strong> {selectedDiagnostic.user.email || 'N/A'}<br/>

                  )}                          <strong>Mongo ID:</strong> {selectedDiagnostic.user.mongoUserId || 'N/A'}<br/>

                          <strong>Shopify ID:</strong> {selectedDiagnostic.user.shopifyCustomerId || 'N/A'}<br/>

                  <Paper sx={{ p: 2, mb: 2 }}>                          <strong>Authenticated:</strong> {selectedDiagnostic.user.isAuthenticated ? '✅' : '❌'}

                    <Typography variant="subtitle1" gutterBottom>Environment</Typography>                        </Typography>

                    <Typography variant="body2">                      </Paper>

                      <strong>User Agent:</strong> {selectedDiagnostic.environment?.userAgent?.substring(0, 60)}...<br/>                    </AccordionDetails>

                      <strong>Online:</strong> {selectedDiagnostic.environment?.onLine ? '✅' : '❌'}<br/>                  </Accordion>

                      <strong>Cookies:</strong> {selectedDiagnostic.environment?.cookiesEnabled ? '✅' : '❌'}

                    </Typography>                  {/* Form Data */}

                  </Paper>                  {selectedDiagnostic.formData?.fields && (

                    <Accordion>

                  <Box sx={{ mt: 2 }}>                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                    <Typography variant="subtitle1" gutterBottom>                        <Typography variant="subtitle1">Form Data</Typography>

                      Admin Notes                      </AccordionSummary>

                    </Typography>                      <AccordionDetails>

                    <TextField                        <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>

                      fullWidth                          <Typography variant="body2">

                      multiline                            <strong>Missing Required:</strong> {selectedDiagnostic.formData.missingRequiredFields?.join(', ') || 'None'}<br/>

                      rows={3}                            <strong>Files:</strong> {selectedDiagnostic.formData.fileCount || 0}<br/>

                      value={selectedDiagnostic.adminNotes || ''}                            <strong>Form Size:</strong> {(selectedDiagnostic.formData.formSize || 0)} bytes

                      onChange={(e) => setSelectedDiagnostic({                           </Typography>

                        ...selectedDiagnostic,                         </Paper>

                        adminNotes: e.target.value                       </AccordionDetails>

                      })}                    </Accordion>

                      onBlur={(e) => updateDiagnostic(selectedDiagnostic._id, {                   )}

                        adminNotes: e.target.value 

                      })}                  {/* Environment */}

                      placeholder="Add notes about this diagnostic..."                  <Accordion>

                    />                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>

                  </Box>                      <Typography variant="subtitle1">Environment</Typography>

                </Box>                    </AccordionSummary>

              ) : (                    <AccordionDetails>

                <Box textAlign="center" py={4}>                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>

                  <Typography variant="body1" color="text.secondary">                        <Typography variant="body2">

                    Select a diagnostic to view details                          <strong>User Agent:</strong> {selectedDiagnostic.environment?.userAgent?.substring(0, 60)}...<br/>

                  </Typography>                          <strong>Online:</strong> {selectedDiagnostic.environment?.onLine ? '✅' : '❌'}<br/>

                </Box>                          <strong>Cookies:</strong> {selectedDiagnostic.environment?.cookiesEnabled ? '✅' : '❌'}

              )}                        </Typography>

            </CardContent>                      </Paper>

          </Card>                    </AccordionDetails>

        </Grid>                  </Accordion>

      </Grid>

    </Box>                  {/* Admin Notes */}

  );                  <Box sx={{ mt: 2 }}>

}                    <Typography variant="subtitle1" gutterBottom>
                      Admin Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={selectedDiagnostic.adminNotes || ''}
                      onChange={(e) => setSelectedDiagnostic({ 
                        ...selectedDiagnostic, 
                        adminNotes: e.target.value 
                      })}
                      onBlur={(e) => updateDiagnostic(selectedDiagnostic._id, { 
                        adminNotes: e.target.value 
                      })}
                      placeholder="Add notes about this diagnostic..."
                    />
                  </Box>
                </Box>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    Select a diagnostic to view details
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}