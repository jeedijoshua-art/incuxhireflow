type ResumeState = {
  file?: File;
  targetRole?: string;
  generatingAI?: boolean;
};

let resumeState: ResumeState = {};

export function setResumeState(state: ResumeState) {
  resumeState = {
    ...resumeState,
    ...state,
  };
}

export function getResumeState(): ResumeState {
  return resumeState;
}

export function clearResumeState() {
  resumeState = {};
}
