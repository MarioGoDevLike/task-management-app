import React, { useEffect, useId, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import ReactQuill from 'react-quill';
import {
  X,
  Calendar,
  Flag,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';
import TaskImageAttachZone from './TaskImageAttachZone';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinningLoader = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: var(--wp-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;

  @media (max-width: 768px) {
    padding: 0;
    align-items: flex-end;
  }
`;

const Dialog = styled.div`
  background: var(--wp-surface);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  width: 100%;
  max-width: 720px;
  max-height: min(92vh, 880px);
  display: flex;
  flex-direction: column;
  box-shadow: var(--wp-shadow-xl);
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    max-width: 100%;
    max-height: 96vh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
  }
`;

const DialogHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 0;
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 16px 16px 0;
  }
`;

const HeaderText = styled.div`
  h2 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--wp-text);
    letter-spacing: -0.3px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--wp-text-muted);
    line-height: 1.4;
  }
`;

const IconClose = styled.button`
  width: 32px;
  height: 32px;
  border: 1px solid var(--wp-border);
  border-radius: 8px;
  background: var(--wp-surface);
  color: var(--wp-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: var(--wp-surface-2);
    color: var(--wp-text);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DialogBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 20px;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const MainColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
`;

const SideColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;

  @media (max-width: 768px) {
    order: -1;
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SectionCard = styled.div`
  background: var(--wp-surface-2);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wp-text-muted);

  svg {
    color: var(--wp-text-subtle);
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: var(--wp-text);

  span.required {
    color: var(--wp-error);
    margin-left: 2px;
  }
`;

const FieldHint = styled.span`
  font-size: 12px;
  color: var(--wp-text-subtle);
  line-height: 1.4;
`;

const FieldError = styled.span`
  font-size: 12px;
  color: var(--wp-error);
  font-weight: 500;
`;

const TextInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid ${(p) => (p.$error ? 'var(--wp-error)' : 'var(--wp-input-border)')};
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: var(--wp-input-bg);
  color: var(--wp-text);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--wp-input-placeholder);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--wp-input-border);
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.55;
  min-height: 120px;
  resize: vertical;
  font-family: inherit;
  background: var(--wp-input-bg);
  color: var(--wp-text);
  transition: border-color 0.15s, box-shadow 0.15s;

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
  }

  &::placeholder {
    color: var(--wp-input-placeholder);
  }
`;

const RichTextWrap = styled.div`
  border: 1px solid var(--wp-input-border);
  border-radius: var(--wp-radius-lg);
  overflow: hidden;
  background: var(--wp-input-bg);
  position: relative;

  &:focus-within {
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }

  .ql-toolbar.ql-snow {
    border: none;
    border-bottom: 1px solid var(--wp-border);
    background: var(--wp-surface-2);
  }

  .ql-container.ql-snow {
    border: none;
    font-size: 14px;
  }

  .ql-editor {
    min-height: 140px;
    max-height: min(280px, 35vh);
    overflow-y: auto;
  }

  .ql-snow .ql-picker.ql-expanded .ql-picker-options {
    z-index: 10050;
  }
`;

const UploadOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  border-radius: var(--wp-radius-lg);
  color: var(--wp-on-primary);
  font-size: 13px;
  font-weight: 600;
  gap: 8px;
`;

const ChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Chip = styled.button`
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${(p) => (p.$active ? p.$border || 'var(--wp-primary)' : 'var(--wp-border)')};
  background: ${(p) => (p.$active ? p.$bg || 'var(--wp-primary-muted)' : 'var(--wp-surface)')};
  color: ${(p) => (p.$active ? p.$color || 'var(--wp-primary)' : 'var(--wp-text-muted)')};
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: ${(p) => p.$border || 'var(--wp-primary-border)'};
    background: ${(p) => p.$bg || 'var(--wp-primary-muted)'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DateInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 9px 10px;
  border: 1px solid var(--wp-input-border);
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  background: var(--wp-input-bg);
  color: var(--wp-text);

  &:focus {
    outline: none;
    border-color: var(--wp-primary);
    box-shadow: 0 0 0 3px var(--wp-focus-ring);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

const DialogFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--wp-border);
  background: var(--wp-surface);
  flex-shrink: 0;

  @media (max-width: 768px) {
    padding: 12px 16px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
  }
`;

const Btn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.15s, transform 0.1s;
  min-height: 40px;

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const BtnSecondary = styled(Btn)`
  background: var(--wp-surface-2);
  color: var(--wp-text);
  border: 1px solid var(--wp-border);

  &:hover:not(:disabled) {
    background: var(--wp-hover);
  }
`;

const BtnPrimary = styled(Btn)`
  background: var(--wp-primary);
  color: var(--wp-on-primary);

  &:hover:not(:disabled) {
    background: var(--wp-primary-hover);
  }
`;

const SavingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  border-radius: inherit;
`;

const SavingCard = styled.div`
  background: var(--wp-surface-elevated);
  border: 1px solid var(--wp-border);
  border-radius: var(--wp-radius-lg);
  padding: 20px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow: var(--wp-shadow-lg);

  p {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--wp-text);
  }
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid var(--wp-border);
  border-top-color: var(--wp-primary);
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

const PRIORITY_META = {
  low: { label: 'Low', bg: 'var(--wp-surface-2)', color: 'var(--wp-text-muted)', border: 'var(--wp-border)' },
  medium: { label: 'Medium', bg: 'var(--wp-info-bg)', color: 'var(--wp-info)', border: 'var(--wp-info-border)' },
  high: { label: 'High', bg: 'var(--wp-warning-bg)', color: 'var(--wp-warning)', border: 'var(--wp-warning-border)' },
  urgent: { label: 'Urgent', bg: 'var(--wp-error-bg)', color: 'var(--wp-error)', border: 'var(--wp-error-border)' },
};

export default function TaskFormModal({
  mode,
  open,
  onClose,
  onSubmit,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  dueDate,
  onDueDateChange,
  status,
  onStatusChange,
  kanbanColumns = [],
  isSubmitting = false,
  isUploadingImage = false,
  quillRef,
  quillModules,
  quillFormats,
  attachments = [],
  onAttachmentsChange,
  onAttachFiles,
  titleError,
}) {
  const titleId = useId();
  const descId = useId();
  const [touched, setTouched] = useState(false);

  const isCreate = mode === 'create';
  const showTitleError = touched && titleError;

  useEffect(() => {
    if (!open) setTouched(false);
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    setTouched(true);
    onSubmit(e);
  };

  return (
    <Overlay onClick={onClose} role="presentation">
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {isSubmitting && (
          <SavingOverlay>
            <SavingCard>
              <Spinner aria-hidden />
              <p>{isCreate ? 'Creating task…' : 'Saving changes…'}</p>
            </SavingCard>
          </SavingOverlay>
        )}

        <DialogHeader>
          <HeaderText>
            <h2 id={titleId}>{isCreate ? 'New task' : 'Edit task'}</h2>
            <p>{isCreate ? 'Add a task to the current project' : 'Update task details and planning'}</p>
          </HeaderText>
          <IconClose type="button" onClick={onClose} disabled={isSubmitting} aria-label="Close">
            <X size={16} />
          </IconClose>
        </DialogHeader>

        <DialogBody>
          <FormGrid as="form" id="task-form-modal" onSubmit={handleSubmit}>
            <MainColumn>
              <Section aria-labelledby="section-basic">
                <SectionLabel id="section-basic">
                  <FileText size={14} />
                  Basic information
                </SectionLabel>
                <Field>
                  <FieldLabel htmlFor="task-title">
                    Task name<span className="required">*</span>
                  </FieldLabel>
                  <TextInput
                    id="task-title"
                    type="text"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="What needs to be done?"
                    required
                    autoFocus
                    disabled={isSubmitting}
                    $error={!!showTitleError}
                    aria-invalid={!!showTitleError}
                    aria-describedby={showTitleError ? 'title-error' : undefined}
                  />
                  {showTitleError && <FieldError id="title-error">{titleError}</FieldError>}
                </Field>
                <Field>
                  <FieldLabel htmlFor={isCreate ? 'task-desc-plain' : descId}>Description</FieldLabel>
                  {isCreate ? (
                    <>
                      <TextArea
                        id="task-desc-plain"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        placeholder="Add context, acceptance criteria, or notes…"
                        disabled={isSubmitting}
                        rows={4}
                      />
                      <FieldHint>Rich formatting is available after creating the task.</FieldHint>
                    </>
                  ) : (
                    <RichTextWrap>
                      <ReactQuill
                        ref={quillRef}
                        id={descId}
                        value={description}
                        onChange={onDescriptionChange}
                        modules={quillModules}
                        formats={quillFormats}
                        readOnly={isSubmitting}
                      />
                      {isUploadingImage && (
                        <UploadOverlay role="status">
                          <SpinningLoader size={18} />
                          Uploading image…
                        </UploadOverlay>
                      )}
                    </RichTextWrap>
                  )}
                </Field>
              </Section>

              {onAttachFiles && (
                <Section aria-labelledby="section-attachments">
                  <TaskImageAttachZone
                    attachments={attachments}
                    onFilesSelected={onAttachFiles}
                    onRemove={
                      onAttachmentsChange
                        ? (id) => onAttachmentsChange(attachments.filter((a) => a.id !== id))
                        : undefined
                    }
                    disabled={isSubmitting}
                    busy={isUploadingImage}
                  />
                </Section>
              )}
            </MainColumn>

            <SideColumn>
              <SectionCard aria-labelledby="section-planning">
                <SectionLabel id="section-planning">
                  <Flag size={14} />
                  Planning
                </SectionLabel>

                <Field>
                  <FieldLabel>Priority</FieldLabel>
                  <ChipGroup role="group" aria-label="Priority">
                    {Object.entries(PRIORITY_META).map(([key, meta]) => (
                      <Chip
                        key={key}
                        type="button"
                        $active={priority === key}
                        $bg={meta.bg}
                        $color={meta.color}
                        $border={meta.border}
                        onClick={() => onPriorityChange(key)}
                        disabled={isSubmitting}
                      >
                        {meta.label}
                      </Chip>
                    ))}
                  </ChipGroup>
                </Field>

                {!isCreate && kanbanColumns.length > 0 && (
                  <Field>
                    <FieldLabel>
                      <Layers size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                      Status
                    </FieldLabel>
                    <ChipGroup role="group" aria-label="Status">
                      {kanbanColumns.map((col) => (
                        <Chip
                          key={col.id}
                          type="button"
                          $active={status === col.id}
                          onClick={() => onStatusChange(col.id)}
                          disabled={isSubmitting}
                        >
                          {col.label}
                        </Chip>
                      ))}
                      {status && !kanbanColumns.some((c) => c.id === status) && (
                        <Chip type="button" $active>
                          {status} (legacy)
                        </Chip>
                      )}
                    </ChipGroup>
                  </Field>
                )}

                <Field>
                  <FieldLabel htmlFor="task-due-date">
                    <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
                    Due date
                  </FieldLabel>
                  <DateInput
                    id="task-due-date"
                    type="date"
                    value={dueDate || ''}
                    onChange={(e) => onDueDateChange(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <FieldHint>Optional deadline</FieldHint>
                </Field>
              </SectionCard>
            </SideColumn>
          </FormGrid>
        </DialogBody>

        <DialogFooter>
          <BtnSecondary type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </BtnSecondary>
          <BtnPrimary
            type="submit"
            form="task-form-modal"
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? (
              <>
                <Spinner style={{ width: 16, height: 16, borderWidth: 2 }} />
                {isCreate ? 'Creating…' : 'Saving…'}
              </>
            ) : isCreate ? (
              'Create task'
            ) : (
              'Save changes'
            )}
          </BtnPrimary>
        </DialogFooter>
      </Dialog>
    </Overlay>
  );
}
