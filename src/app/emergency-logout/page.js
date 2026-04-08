'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { 
  Box, 
  Typography, 
  Container,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';

import { useEmergencyLogout } from '@/hooks/auth/useEmergencyLogout';
import SessionStatusAlert from './components/SessionStatusAlert';
import LogoutOptionsList from './components/LogoutOptionsList';
import DebugToolsList from './components/DebugToolsList';
import DatabaseRoleFixTools from './components/DatabaseRoleFixTools';

export default function EmergencyLogoutPage() {
  const sessionState = useSession() || {};
  const { data: session = null, status = 'unauthenticated' } = sessionState;
  const {
    handleForceLogout,
    handleRegularLogout,
    handleDebugAuth,
    handleComprehensiveDebug,
    clearRoleOverride,
    executeNuclearLogout,
    checkDatabaseRole,
    fixRoleToAdmin
  } = useEmergencyLogout();

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <BugReportIcon sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
               Emergency Session Management
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Use this page to resolve authentication issues
            </Typography>
          </Box>

          <SessionStatusAlert status={status} session={session} />

          <Divider sx={{ my: 3 }} />

          <LogoutOptionsList 
            handleDebugAuth={handleDebugAuth}
            handleRegularLogout={handleRegularLogout}
            handleForceLogout={handleForceLogout}
          />

          <Divider sx={{ my: 3 }} />

          <DebugToolsList 
            handleComprehensiveDebug={() => handleComprehensiveDebug(status, session)}
            clearRoleOverride={clearRoleOverride}
            executeNuclearLogout={executeNuclearLogout}
          />

          <Divider sx={{ my: 3 }} />

          <DatabaseRoleFixTools 
            checkDatabaseRole={checkDatabaseRole}
            fixRoleToAdmin={fixRoleToAdmin}
            session={session}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
