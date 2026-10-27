import React, { useId, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { ImagePlus, Upload, Loader2, X } from 'lucide-react';
import {
  TASK_IMAGE_ACCEPT,
  TASK_IMAGE_MAX_COUNT,
} from '../utils/taskImages';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const SpinningLoader = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
`;

const Root = styled.div`
  ${(p) =>
    p.$compact
      ? `
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    max-width: 100%;
  `
      : ''}
`;

const Zone = styled.div`
  position: relative;
  border: 1.5px dashed ${(p) => (p.$active ? 'var(--wp-primary)' : 'var(--wp-border-strong)')};
  border-radius: var(--wp-radius-lg);
  padding: ${(p) => (p.$compact ? '8px 12px' : '16px')};
  text-align: ${(p) => (p.$compact ? 'left' : 'center')};
  background: ${(p) => (p.$active ? 'var(--wp-primary-muted)' : 'var(--wp-surface)')};
  transition: border-color 0.15s, background 0.15s;
  min-height: ${(p) => (p.$compact ? '36px' : 'auto')};

  &:hover:not([data-disabled='true']) {
    border-color: var(--wp-primary);
    background: var(--wp-primary-muted);
  }

  &[data-disabled='true'] {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
  font-size: 0;

  &:disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
`;

const ZoneContent = styled.div`
  position: relative;
  z-index: 1;
  pointer-events: none;
  display: ${(p) => (p.$compact ? 'flex' : 'block')};
  align-items: center;
  gap: ${(p) => (p.$compact ? '6px' : '0')};

  .icon {
    width: ${(p) => (p.$compact ? '24px' : '36px')};
    height: ${(p) => (p.$compact ? '24px' : '36px')};
    margin: ${(p) => (p.$compact ? '0' : '0 auto 8px')};
    border-radius: 8px;
    background: var(--wp-surface-2);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wp-primary);
    flex-shrink: 0;
  }

  .title {
    font-size: ${(p) => (p.$compact ? '11px' : '13px')};
    font-weight: 600;
    color: var(--wp-text);
    margin-bottom: ${(p) => (p.$compact ? '0' : '4px')};
  }

  .sub {
    font-size: 11px;
    color: var(--wp-text-subtle);
  }
`;

const ImageGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
`;

const ImageThumb = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--wp-border);
  background: var(--wp-surface-2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const RemoveImage = styled.button`
  position: absolute;
  top: 3px;
  right: 3px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  pointer-events: auto;
  z-index: 2;

  &:hover {
    background: var(--wp-error);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wp-text-subtle);
  margin-bottom: 8px;
`;

/**
 * Reliable image attach zone — full-size transparent file input overlay.
 * Works on Windows/Electron where hidden inputs + programmatic .click() fail.
 */
export default function TaskImageAttachZone({
  attachments = [],
  onFilesSelected,
  onRemove,
  disabled = false,
  busy = false,
  compact = false,
  showLabel = true,
  label = 'Attachments',
  className,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);

  const isBusy = busy || localBusy;
  const isDisabled =
    disabled || isBusy || attachments.length >= TASK_IMAGE_MAX_COUNT;

  const runUpload = async (fileList) => {
    if (!fileList?.length || !onFilesSelected || isDisabled) return;
    setLocalBusy(true);
    try {
      await onFilesSelected(fileList);
    } finally {
      setLocalBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    const files = e.target.files;
    if (files?.length) runUpload(files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) runUpload(e.dataTransfer.files);
  };

  return (
    <Root className={className} $compact={compact}>
      {showLabel && !compact && (
        <SectionLabel>
          <ImagePlus size={14} />
          {label}
        </SectionLabel>
      )}

      <Zone
        $active={dragActive}
        $compact={compact}
        data-disabled={isDisabled ? 'true' : 'false'}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!isDisabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isDisabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <FileInput
          ref={inputRef}
          id={inputId}
          type="file"
          accept={TASK_IMAGE_ACCEPT}
          multiple
          disabled={isDisabled}
          onChange={handleChange}
          aria-label={compact ? 'Attach images' : 'Upload task images'}
        />
        <ZoneContent $compact={compact}>
          <div className="icon">
            {isBusy ? (
              <SpinningLoader size={compact ? 13 : 18} />
            ) : compact ? (
              <ImagePlus size={13} />
            ) : (
              <Upload size={18} />
            )}
          </div>
          <div>
            <div className="title">
              {isBusy
                ? 'Processing…'
                : compact
                  ? 'Attach'
                  : 'Drop images here or click to upload'}
            </div>
            {!compact && (
              <div className="sub">
                PNG, JPG, GIF, WebP · max 5MB · {attachments.length}/{TASK_IMAGE_MAX_COUNT}
              </div>
            )}
          </div>
        </ZoneContent>
      </Zone>

      {attachments.length > 0 && (
        <ImageGrid role="list" aria-label="Attached images">
          {attachments.map((img) => (
            <ImageThumb key={img.id} role="listitem">
              <img src={img.dataUrl} alt={img.name || 'Attachment'} />
              {onRemove && (
                <RemoveImage
                  type="button"
                  aria-label={`Remove ${img.name || 'image'}`}
                  onClick={() => onRemove(img.id)}
                  disabled={disabled || isBusy}
                >
                  <X size={11} />
                </RemoveImage>
              )}
            </ImageThumb>
          ))}
        </ImageGrid>
      )}
    </Root>
  );
}
