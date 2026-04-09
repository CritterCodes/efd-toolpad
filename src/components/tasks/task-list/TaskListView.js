import React from 'react';
import { Box, Paper, Typography, Pagination } from '@mui/material';
import { UniversalTaskCard, CompactTaskCard } from '../TaskCard';

export function TaskListView({
  paginatedTasks,
  searchTerm,
  filterBy,
  viewMode,
  totalPages,
  currentPage,
  setCurrentPage,
  onTaskEdit,
  onTaskDelete,
  onTaskSelect
}) {
  if (paginatedTasks.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No tasks found
        </Typography>
        {searchTerm || filterBy !== 'all' ? (
          <Typography variant="body2" color="text.secondary">
            Try adjusting your search or filter criteria
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Create your first universal task to get started
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      {viewMode === 'card' ? (
        <Box sx={{ display: 'grid', gap: 2 }}>
          {paginatedTasks.map(task => (
            <UniversalTaskCard
              key={task._id}
              task={task}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              onSelect={onTaskSelect}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gap: 1 }}>
          {paginatedTasks.map(task => (
            <CompactTaskCard
              key={task._id}
              task={task}
              onSelect={onTaskSelect}
            />
          ))}
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(e, page) => setCurrentPage(page)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}
