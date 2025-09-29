"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

export default function CustomTicketSummary({ summary }) {
    const theme = useTheme();

    if (!summary) return null;

    // Provide safe defaults for undefined values from constitutional MVC
    const safeValue = (value) => (value != null ? Number(value) : 0);

    const summaryCards = [
        {
            title: 'Total Outstanding',
            value: `$${safeValue(summary.totalOutstanding).toFixed(2)}`,
            icon: <TrendingDownIcon />,
            color: theme.palette.error.main,
            bgColor: theme.palette.error.light,
        },
        {
            title: 'Total Reimbursed',
            value: `$${safeValue(summary.totalReimbursed).toFixed(2)}`,
            icon: <TrendingUpIcon />,
            color: theme.palette.success.main,
            bgColor: theme.palette.success.light,
        },
        {
            title: 'Total Quote Value',
            value: `$${safeValue(summary.totalQuoteValue).toFixed(2)}`,
            icon: <MonetizationOnIcon />,
            color: theme.palette.primary.main,
            bgColor: theme.palette.primary.light,
        },
        {
            title: 'Pending Deposits',
            value: summary.pendingDepositOrders,
            icon: <ShoppingCartIcon />,
            color: theme.palette.warning.main,
            bgColor: theme.palette.warning.light,
        },
        {
            title: 'Pending Final Orders',
            value: summary.pendingFinalOrders,
            icon: <PendingActionsIcon />,
            color: theme.palette.secondary.main,
            bgColor: theme.palette.secondary.light,
        }
    ];

    return (
        <Box 
            sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: 2,
                mb: 4
            }}
        >
            {summaryCards.map((card, index) => (
                <Card 
                    key={index}
                    sx={{
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        overflow: 'hidden',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        }
                    }}
                >
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Box 
                                sx={{ 
                                    backgroundColor: card.bgColor,
                                    color: card.color,
                                    borderRadius: '8px',
                                    p: 1,
                                    mr: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {card.icon}
                            </Box>
                            <Typography 
                                variant="body2" 
                                sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 500,
                                    fontSize: '0.875rem'
                                }}
                            >
                                {card.title}
                            </Typography>
                        </Box>
                        <Typography 
                            variant="h4" 
                            sx={{ 
                                fontWeight: 700,
                                color: card.color,
                                lineHeight: 1.2
                            }}
                        >
                            {card.value}
                        </Typography>
                    </CardContent>
                </Card>
            ))}
        </Box>
    );
}

CustomTicketSummary.propTypes = {
    summary: PropTypes.shape({
        totalOutstanding: PropTypes.number.isRequired,
        totalReimbursed: PropTypes.number.isRequired,
        totalQuoteValue: PropTypes.number.isRequired,
        pendingDepositOrders: PropTypes.number.isRequired,
        pendingFinalOrders: PropTypes.number.isRequired
    })
};
