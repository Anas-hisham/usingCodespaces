import { createSlice } from '@reduxjs/toolkit';
import { loadInitialState } from '@/store/persistence/loadInitialState';
import { sessionReducers } from '@/store/crm/reducers/sessionReducers';
import { touchPointReducers } from '@/store/crm/reducers/touchPointReducers';
import { leadWorkflowReducers } from '@/store/crm/reducers/leadWorkflowReducers';
import { leadPoolReducers } from '@/store/crm/reducers/leadPoolReducers';
import { callLogReducers } from '@/store/crm/reducers/callLogReducers';
import { leadTransferReducers } from '@/store/crm/reducers/leadTransferReducers';
import { teamReducers } from '@/store/crm/reducers/teamReducers';
import { meetingReducers } from '@/store/crm/reducers/meetingReducers';
import { teamUpdateReducers } from '@/store/crm/reducers/teamUpdateReducers';
import { taskReducers } from '@/store/crm/reducers/taskReducers';
import { tipReducers } from '@/store/crm/reducers/tipReducers';
import { emailReducers } from '@/store/crm/reducers/emailReducers';
import { salesReducers } from '@/store/crm/reducers/salesReducers';
import { schedulerReducers } from '@/store/crm/reducers/schedulerReducers';
import { escalationReducers } from '@/store/crm/reducers/escalationReducers';
import { workflowReducers } from '@/store/crm/reducers/workflowReducers';
import { notificationReducers } from '@/store/crm/reducers/notificationReducers';

/**
 * The single "crm" slice. It only ASSEMBLES the reducers; the logic of each one lives in
 * store/crm/reducers/<topic>Reducers.ts so every file answers one question.
 */
const slice = createSlice({
  name: 'crm',
  initialState: loadInitialState,
  reducers: {
    ...sessionReducers,
    ...touchPointReducers,
    ...leadWorkflowReducers,
    ...leadPoolReducers,
    ...callLogReducers,
    ...leadTransferReducers,
    ...teamReducers,
    ...meetingReducers,
    ...teamUpdateReducers,
    ...taskReducers,
    ...tipReducers,
    ...emailReducers,
    ...salesReducers,
    ...schedulerReducers,
    ...notificationReducers,
    ...workflowReducers,
    ...escalationReducers,
  },
});

export const crmActions = slice.actions;
export const {
  setCurrentUser, applyStateFromOtherTab, logCallAndCompleteTouchPoint, completeTouchPoint, skipTouchPoint, restoreSkippedTouchPoint,
  stopLeadWorkflow, resumeLeadWorkflow, removeLeadFromAgentQueue, deleteLeadPermanently,
  addLeadsToPool, deleteLeadsAsAdmin, takeLeadsFromPool, moveAgentToTeam, addCallLogWithoutCompletingTouchPoint, editCallLog, transferLeadToAgent,
  createMeeting, updateMeeting, postTeamUpdate, acknowledgeTeamUpdate, markUpdatesSeen, createTask, toggleTaskCompletion, markTasksSeen,
  sendTips, acknowledgeTip, markTipsSeen,
  sendEmailForLead, sendBulkEmailForLeads, sendStandaloneEmail, recordSale, deleteSale, runScheduledJobs,
  saveWorkflow, deleteWorkflow, assignTeamToManager, setAgentQuality,
  createEscalation, forwardEscalation, resolveEscalation,
  markNotificationRead, markAllNotificationsRead, addNotification, resetToSeedData,
} = slice.actions;
export default slice.reducer;
