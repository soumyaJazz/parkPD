import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { EMPTY_DRAFT } from '../types/questionnaire';
import type { QuestionnaireDraft } from '../types/questionnaire';

type SetupDraftValue = {
  draft: QuestionnaireDraft;
  setDraft: (
    update: (previous: QuestionnaireDraft) => QuestionnaireDraft,
  ) => void;
  /** Drops the answers once they have been saved, or the session ends. */
  clearDraft: () => void;
};

const SetupDraftContext = createContext<SetupDraftValue | null>(null);

/**
 * Holds the questionnaire's answers above the screen that collects them.
 *
 * Setup runs over two screens, and a rejection the server can only raise at
 * save time - a phone number already on another account - is a fault in the
 * first one. Fixing it means stepping back, which in a stack navigator unmounts
 * the questionnaire and would take every answer with it. Kept here, the answers
 * outlive that trip and the user returns to the form as they left it.
 */
export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<QuestionnaireDraft>(EMPTY_DRAFT);

  const setDraft = useCallback(
    (update: (previous: QuestionnaireDraft) => QuestionnaireDraft) => {
      setDraftState(update);
    },
    [],
  );

  const clearDraft = useCallback(() => setDraftState(EMPTY_DRAFT), []);

  const value = useMemo(
    () => ({ draft, setDraft, clearDraft }),
    [draft, setDraft, clearDraft],
  );

  return (
    <SetupDraftContext.Provider value={value}>
      {children}
    </SetupDraftContext.Provider>
  );
}

export function useSetupDraft(): SetupDraftValue {
  const value = useContext(SetupDraftContext);
  if (value === null) {
    throw new Error('useSetupDraft must be used inside a SetupDraftProvider');
  }
  return value;
}
