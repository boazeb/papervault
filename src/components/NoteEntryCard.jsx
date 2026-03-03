import React from 'react';
import { Card, Form, Button, Collapse } from 'react-bootstrap';
import { FaTrash, FaChevronDown, FaChevronUp, FaExclamationTriangle, FaCheck } from 'react-icons/fa';

function NoteEntryCard({ 
    entry, 
    index, 
    onUpdate, 
    onRemove,
    isExpanded = false,
    onToggleExpanded,
    entryMode = 'view',
    onSave,
    onCancel,
    onEdit
}) {
    const handleFieldChange = (field, value) => {
        onUpdate(index, field, value);
    };

    const handleRemove = () => {
        onRemove(index);
    };

    // Get summary info for collapsed state (reactive to entry changes)
    const summaryInfo = React.useMemo(() => {
        const title = entry.title || 'New Note Entry';
        const hasContent = !!entry.content;
        
        return { title, hasContent };
    }, [entry.title, entry.content]);

    // Check for validation issues (only show if entry has content)
    const hasValidationIssues = React.useMemo(() => {
        // Don't show validation errors if entry is completely empty (new entry)
        const hasAnyContent = entry.title || entry.content;
        if (!hasAnyContent) return false;
        
        // Only show validation issues if we're in view mode
        return entryMode === 'view' && (!entry.title || !entry.content);
    }, [entry.title, entry.content, entryMode]);

    // Check if entry can be saved (for Save button)
    const canSave = React.useMemo(() => {
        return entry.title && entry.content;
    }, [entry.title, entry.content]);

    return (
        <Card className="mb-3 entry-card">
            <Card.Body>
                {/* Accordion Header */}
                <div 
                    className="d-flex justify-content-between align-items-center accordion-header"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onToggleExpanded && onToggleExpanded(index)}
                >
                    <div className="d-flex align-items-center flex-grow-1">
                        <div className="me-2">
                            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                        </div>
                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center">
                                <h6 className="mb-0 me-2">
                                    {summaryInfo.title}
                                </h6>
                                {hasValidationIssues && (
                                    <FaExclamationTriangle className="text-warning me-2" size={14} />
                                )}
                                {!hasValidationIssues && entryMode === 'view' && (
                                    <FaCheck className="text-success me-2" size={14} />
                                )}
                            </div>
                            {!isExpanded && (
                                <small className="text-muted">
                                    {summaryInfo.hasContent ? 'Content added' : 'No content'}
                                </small>
                            )}
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        {entryMode === 'view' && (
                            <>
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit();
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove();
                                    }}
                                >
                                    <FaTrash />
                                </Button>
                            </>
                        )}
                        {entryMode === 'edit' && (
                            <>
                                <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCancel();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSave();
                                    }}
                                    disabled={!canSave}
                                >
                                    Save
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Accordion Content */}
                <Collapse in={isExpanded}>
                    <div className="mt-3">
                        <Form.Group className="mb-2">
                            <Form.Label>Title</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Note title"
                                value={entry.title}
                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                disabled={entryMode === 'view'}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                            <Form.Label>Content</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Your secure note content..."
                                value={entry.content}
                                onChange={(e) => handleFieldChange('content', e.target.value)}
                                disabled={entryMode === 'view'}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </Form.Group>


                    </div>
                </Collapse>
            </Card.Body>
        </Card>
    );
}

export default NoteEntryCard; 