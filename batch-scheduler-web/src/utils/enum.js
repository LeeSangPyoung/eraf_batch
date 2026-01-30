export const failStates = [
  'FAILED',
  'BROKEN',
  'BLOCKED',
  'FAILURE',
  'failure',
  'cancelled',
  'false',
  'failed',
  'STOPPED',
  'stopped',
  'TIMEOUT',
  'timeout',
];
export const successStates = [
  'success',
  'SUCCESS',
  'true',
  'SUCCEED',
  'succeed',
];

export const runningStates = [
  'RUNNING',
  'running',
  'READY TO RUN',
  'ready to run',
  'ASSIGNED',
  'assigned',
];

export const standbyStates = ['STANDBY', 'standby', 'PENDING', 'pending', 'WAITING', 'waiting', 'DISABLED', 'disabled'];

export const completedStates = [
  'COMPLETED',
  'completed',
  'SCHEDULED',
  'scheduled',
  'RETRY SCHEDULED',
  'retry SCHEDULED',
  'CREATED',
  'created',
];

export const enableOptions = ['true', 'false'];
export const wfRegisteredOptions = ['Yes', 'No'];
export const currentStateOptions = [
  'READY TO RUN',
  'RUNNING',
  'SCHEDULED',
  'RETRY SCHEDULED',
  'BLOCKED',
  'BROKEN',
  'COMPLETED',
  'DISABLED',
  'FAILED',
  'DELETED',
];

export const workflowStatusOptions = [
  'CREATED',
  'ASSIGNED',
  'RUNNING',
  'SUCCESS',
  'FAILED',
];

export const workflowRunStatusOptions = ['RUNNING', 'SUCCESS', 'FAILED'];

export const lastResultOptions = ['succeed', 'failed'];

export const operationOptions = [
  'CREATE',
  'BROKEN',
  'COMPLETED',
  'ENABLED',
  'DISABLED',
  'RUN',
  'RETRY_RUN',
  'RECOVERY_RUN',
  'SCHEDULED',
  'READY_TO_RUN',
  'RETRY_SCHEDULED',
  'BLOCKED',
  'FAILED',
  'UPDATE',
];

export const httpRequestPattern =
  /^(GET|POST|PUT|DELETE|PATCH|OPTIONS) [^\s]+ HTTP\/1\.1\r?\nHost: (https?:\/\/[^\s]+)\r?\n/;

export const UserType = [
  { value: 0, label: 'Administrator' },
  { value: 1, label: 'General User' },
];
