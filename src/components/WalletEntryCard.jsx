import React, { useState, useRef } from 'react';
import { Card, Form, InputGroup, Button, Badge, ListGroup, Collapse } from 'react-bootstrap';
import { FaTrash, FaEye, FaEyeSlash as FaHide, FaCheck, FaExclamationTriangle, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const bip39 = require('bip39');


function WalletEntryCard({ 
    entry, 
    index, 
    onUpdate, 
    onRemove, 
    isFieldVisible, 
    onToggleVisibility,
    isExpanded = false,
    onToggleExpanded,
    entryMode = 'view',
    onSave,
    onCancel,
    onEdit
}) {
    const [showAutocomplete, setShowAutocomplete] = useState(false);
    const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
    const [, setCurrentWordIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textareaRef = useRef(null);

    const handleFieldChange = (field, value) => {
        onUpdate(index, field, value);
        
        // Handle autocomplete for seed field
        if (field === 'seed') {
            handleSeedAutocomplete(value);
        }
    };

    const handleRemove = () => {
        onRemove(index);
    };

    const handleToggleVisibility = (field) => {
        onToggleVisibility(field);
    };

    const getBIP39Wordlist = () => {
        return bip39.wordlists.english;
    };

    // Handle autocomplete for seed phrase
    const handleSeedAutocomplete = (seedValue) => {
        if (!seedValue) {
            setShowAutocomplete(false);
            return;
        }

        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = seedValue.slice(0, cursorPos);
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];
        const wordIndex = words.length - 1;

        setCursorPosition(cursorPos);
        setCurrentWordIndex(wordIndex);

        // Get the wordlist for validation
        const wordlist = getBIP39Wordlist();

        // Don't show autocomplete if:
        // 1. Current word is empty
        // 2. Current word is too long (>7 chars, likely complete)
        // 3. Current word is already a complete BIP39 word
        // 4. Cursor is not at the end of the current word (user is editing middle)
        const isAtEndOfCurrentWord = cursorPos === textBeforeCursor.length;
        const isCompleteWord = wordlist.includes(currentWord.toLowerCase());
        const isReasonableLength = currentWord.length > 0 && currentWord.length <= 7;

        if (currentWord && isAtEndOfCurrentWord && isReasonableLength && !isCompleteWord) {
            const suggestions = wordlist
                .filter(word => word.startsWith(currentWord.toLowerCase()))
                .slice(0, 6); // Limit to 6 suggestions

            if (suggestions.length > 0) {
                setAutocompleteSuggestions(suggestions);
                setShowAutocomplete(true);
            } else {
                setShowAutocomplete(false);
            }
        } else {
            setShowAutocomplete(false);
        }
    };

    // Handle autocomplete selection
    const selectAutocomplete = (suggestion) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const seedValue = entry.seed;
        const cursorPos = cursorPosition;
        const textBeforeCursor = seedValue.slice(0, cursorPos);
        const textAfterCursor = seedValue.slice(cursorPos);
        
        const words = textBeforeCursor.split(/\s+/);
        const currentWord = words[words.length - 1];
        
        // Replace the current word with the suggestion
        const newTextBefore = textBeforeCursor.slice(0, textBeforeCursor.length - currentWord.length) + suggestion;
        const newSeedValue = newTextBefore + ' ' + textAfterCursor;
        
        handleFieldChange('seed', newSeedValue);
        setShowAutocomplete(false);
        
        // Focus back to textarea and position cursor after the completed word
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = newTextBefore.length + 1;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    };

    // Handle keyboard navigation in autocomplete
    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setShowAutocomplete(false);
        }
    };

    // Handle paste events - hide autocomplete immediately when pasting
    const handlePaste = (e) => {
        setShowAutocomplete(false);
        // Let the paste event proceed normally
    };

    // Get real-time word validation
    const getWordValidation = (seedPhrase) => {
        if (!seedPhrase) return { validWords: [], invalidWords: [], totalWords: 0 };
        
        const words = seedPhrase.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const wordlist = getBIP39Wordlist();
        
        const validWords = [];
        const invalidWords = [];
        
        words.forEach((word, idx) => {
            if (wordlist.includes(word)) {
                validWords.push({ word, index: idx });
            } else if (word.length > 0) {
                invalidWords.push({ word, index: idx });
            }
        });
        
        return { validWords, invalidWords, totalWords: words.length };
    };

    // Enhanced seed phrase validation with BIP39 checksum
    const validateSeedPhrase = (seedPhrase) => {
        if (!seedPhrase || !seedPhrase.trim()) {
            return { isValid: false, message: '', wordCount: 0, type: 'empty' };
        }

        const cleanSeed = seedPhrase.trim().toLowerCase();
        const words = cleanSeed.split(/\s+/);
        const wordCount = words.length;
        
        // Check word count (common seed phrase lengths)
        const validLengths = [12, 15, 18, 21, 24];
        const isValidLength = validLengths.includes(wordCount);
        
        let message = '';
        let isValid = false;
        let type = 'invalid';
        let details = [];
        
        if (wordCount < 12) {
            message = `Need at least 12 words`;
            type = 'short';
        } else if (!isValidLength) {
            message = `Invalid length - use 12, 15, 18, 21, or 24 words`;
            type = 'invalid_length';
        } else {
            try {
                const invalidWords = words.filter(word => !bip39.wordlists.english.includes(word));

                if (invalidWords.length > 0) {
                    message = `Invalid word${invalidWords.length > 1 ? 's' : ''} detected`;
                    type = 'invalid_words';
                    details = invalidWords;
                } else {
                    const isValidMnemonic = bip39.validateMnemonic(cleanSeed);

                    if (isValidMnemonic) {
                        message = `Valid seed phrase!`;
                        isValid = true;
                        type = 'valid';
                    } else {
                        message = `Checksum invalid`;
                        type = 'invalid_checksum';
                        details = ['Words are valid but in wrong order or corrupted'];
                    }
                }
            } catch (error) {
                message = `${wordCount} words - validation error`;
                type = 'error';
                details = ['Unable to validate seed phrase: ' + error.message];
            }
        }
        
        return { isValid, message, wordCount, type, details };
    };

    // Private key validation for various formats
    const validatePrivateKey = (privateKey) => {
        if (!privateKey || !privateKey.trim()) {
            return { isValid: true, message: '', type: 'empty' }; // Optional field
        }

        const cleanKey = privateKey.trim();
        let message = '';
        let isValid = false;
        let type = 'invalid';
        let format = '';
        let details = [];

        // Check for common private key formats
        
        // 1. Raw Hex (64 characters, 32 bytes)
        const hexPattern = /^[0-9a-fA-F]{64}$/;
        if (hexPattern.test(cleanKey)) {
            // Additional validation: ensure it's not all zeros or all Fs
            if (cleanKey === '0'.repeat(64)) {
                message = 'Invalid - all zeros';
                type = 'invalid_zero';
                details = ['Private key cannot be all zeros'];
            } else if (cleanKey.toLowerCase() === 'f'.repeat(64)) {
                message = 'Invalid - all Fs';
                type = 'invalid_max';
                details = ['Private key cannot be all Fs (max value)'];
            } else {
                message = 'Valid hex private key ✨';
                isValid = true;
                type = 'valid';
                format = 'Raw Hex (64 chars)';
            }
        }
        
        // 2. WIF (Wallet Import Format) - Bitcoin
        else if (cleanKey.length >= 51 && cleanKey.length <= 52) {
            // WIF starts with 5, K, or L for Bitcoin mainnet
            const wifPattern = /^[5KL][1-9A-HJ-NP-Za-km-z]{50,51}$/;
            if (wifPattern.test(cleanKey)) {
                // Basic WIF format validation
                if (cleanKey.startsWith('5')) {
                    message = 'Valid WIF (uncompressed) ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'WIF Uncompressed';
                } else if (cleanKey.startsWith('K') || cleanKey.startsWith('L')) {
                    message = 'Valid WIF (compressed) ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'WIF Compressed';
                }
            } else {
                message = 'Invalid WIF format';
                type = 'invalid_wif';
                details = ['WIF should start with 5, K, or L and be 51-52 characters'];
            }
        }
        
        // 3. Base58 format (other cryptocurrencies)
        else if (cleanKey.length >= 44 && cleanKey.length <= 58) {
            const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]+$/;
            if (base58Pattern.test(cleanKey)) {
                message = 'Valid Base58 format ✨';
                isValid = true;
                type = 'valid';
                format = 'Base58 Encoded';
            } else {
                message = 'Invalid Base58 characters';
                type = 'invalid_base58';
                details = ['Contains invalid Base58 characters (0, O, I, l)'];
            }
        }
        
        // 4. Ethereum private key (0x prefix)
        else if (cleanKey.startsWith('0x') && cleanKey.length === 66) {
            const ethHexPattern = /^0x[0-9a-fA-F]{64}$/;
            if (ethHexPattern.test(cleanKey)) {
                const keyWithoutPrefix = cleanKey.slice(2);
                if (keyWithoutPrefix === '0'.repeat(64)) {
                    message = 'Invalid - all zeros';
                    type = 'invalid_zero';
                    details = ['Private key cannot be all zeros'];
                } else if (keyWithoutPrefix.toLowerCase() === 'f'.repeat(64)) {
                    message = 'Invalid - all Fs';
                    type = 'invalid_max';
                    details = ['Private key cannot be all Fs (max value)'];
                } else {
                    message = 'Valid Ethereum private key ✨';
                    isValid = true;
                    type = 'valid';
                    format = 'Ethereum (0x prefixed)';
                }
            } else {
                message = 'Invalid Ethereum hex format';
                type = 'invalid_eth_hex';
                details = ['Should be 0x followed by 64 hex characters'];
            }
        }
        
        // 5. Check for common mistakes
        else if (cleanKey.length < 32) {
            message = 'Too short for private key';
            type = 'too_short';
            details = ['Private keys are typically 32+ bytes (64+ hex chars)'];
        } else if (cleanKey.length > 100) {
            message = 'Too long for private key';
            type = 'too_long';
            details = ['Private keys are typically under 100 characters'];
        } else {
            // Check if it looks like hex but wrong length
            const partialHexPattern = /^[0-9a-fA-F]+$/;
            if (partialHexPattern.test(cleanKey)) {
                message = `Invalid hex length (${cleanKey.length} chars)`;
                type = 'invalid_hex_length';
                details = [`Expected 64 characters for raw hex, got ${cleanKey.length}`];
            } else {
                message = 'Unrecognized format';
                type = 'unknown_format';
                details = ['Supported: Raw Hex (64 chars), WIF, Base58, Ethereum (0x prefix)'];
            }
        }

        return { isValid, message, type, format, details };
    };

    const seedValidation = validateSeedPhrase(entry.seed);
    const wordValidation = getWordValidation(entry.seed);
    const privateKeyValidation = validatePrivateKey(entry.privateKey);

    // Get appropriate badge color based on validation type
    // eslint-disable-next-line no-unused-vars -- reserved for badge styling
    const _getBadgeVariant = (validation) => {
        const variant = validation.isValid ? 'success' :
                       validation.type === 'short' || validation.type === 'empty' ? 'secondary' :
                       validation.type === 'invalid_checksum' ? 'danger' :
                       validation.type === 'partial_valid' ? 'info' : 'warning';
        
        return variant;
    };

    // Get appropriate form control class
    const getFormControlClass = (validation) => {
        if (!entry.seed) return '';
        if (validation.isValid) return 'is-valid';
        if (validation.type === 'invalid_checksum') return 'is-invalid';
        return '';
    };

    // Get summary info for collapsed state (reactive to entry changes)
    const summaryInfo = React.useMemo(() => {
        const name = entry.name || 'New Wallet Entry';
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        const hasAddress = !!entry.address;
        
        // Check private key validity if provided
        const privateKeyStatus = hasPrivateKey ? 
            (validatePrivateKey(entry.privateKey).isValid ? 'valid' : 'invalid') : 
            'none';
        
        return { name, hasSeed, hasPrivateKey, hasAddress, privateKeyStatus };
    }, [entry.name, entry.seed, entry.privateKey, entry.address]);

    // Check for validation issues (only show if entry has content)
    const hasValidationIssues = React.useMemo(() => {
        // Don't show validation errors if entry is completely empty (new entry)
        const hasAnyContent = entry.name || entry.seed || entry.privateKey || entry.address || entry.notes;
        if (!hasAnyContent) return false;
        
        // Only show validation issues if we're in view mode
        if (entryMode !== 'view') return false;
        
        // Basic field validation - name is required
        if (!entry.name) {
            return true;
        }
        
        // Must have either a valid seed phrase OR a valid private key (or both)
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        
        // If neither seed nor private key is provided
        if (!hasSeed && !hasPrivateKey) {
            return true;
        }
        
        // Validate seed phrase if provided
        if (hasSeed) {
            const seedValidation = validateSeedPhrase(entry.seed);
            if (!seedValidation.isValid) {
                return true;
            }
        }
        
        // Validate private key if provided
        if (hasPrivateKey) {
            const privateKeyValidation = validatePrivateKey(entry.privateKey);
            if (!privateKeyValidation.isValid) {
                return true;
            }
        }
        
        return false;
    }, [entry.name, entry.seed, entry.privateKey, entry.address, entry.notes, entryMode]);

    // Check if entry can be saved (for Save button)
    const canSave = React.useMemo(() => {
        if (!entry.name) return false;
        
        const hasSeed = !!entry.seed;
        const hasPrivateKey = !!entry.privateKey;
        
        // Must have either seed or private key
        if (!hasSeed && !hasPrivateKey) return false;
        
        // Validate seed phrase if provided
        if (hasSeed) {
            const seedValidation = validateSeedPhrase(entry.seed);
            if (!seedValidation.isValid) return false;
        }
        
        // Validate private key if provided
        if (hasPrivateKey) {
            const privateKeyValidation = validatePrivateKey(entry.privateKey);
            if (!privateKeyValidation.isValid) return false;
        }
        
        return true;
    }, [entry.name, entry.seed, entry.privateKey]);

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
                                    {summaryInfo.name}
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
                                    {summaryInfo.hasSeed && 'Seed phrase set'}
                                    {summaryInfo.hasSeed && summaryInfo.hasPrivateKey && ' • '}
                                    {summaryInfo.hasPrivateKey && (
                                        <>
                                            {'Private key '}
                                            <span className={summaryInfo.privateKeyStatus === 'valid' ? 'text-success' : 'text-danger'}>
                                                {summaryInfo.privateKeyStatus === 'valid' ? '✓' : '✗'}
                                            </span>
                                        </>
                                    )}
                                    {!summaryInfo.hasSeed && !summaryInfo.hasPrivateKey && 'No credentials set'}
                                    {summaryInfo.hasAddress && ' • Address set'}
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
                            <Form.Label>Wallet Name</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="e.g., Main Bitcoin Wallet, MetaMask"
                                value={entry.name}
                                onChange={(e) => handleFieldChange('name', e.target.value)}
                                disabled={entryMode === 'view'}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                            />
                        </Form.Group>

                        <Form.Group className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <Form.Label>Seed Phrase <small className="text-muted">(or use private key below)</small></Form.Label>
                        <div className="d-flex gap-2">
                            {/* Elegant word count indicator */}
                            {entry.seed && wordValidation.totalWords > 0 && (
                                <Badge 
                                    bg={wordValidation.invalidWords.length > 0 ? "warning" : "secondary"} 
                                    className="d-flex align-items-center"
                                >
                                    {wordValidation.totalWords} word{wordValidation.totalWords !== 1 ? 's' : ''}
                                    {wordValidation.invalidWords.length > 0 && (
                                        <span className="ms-1">({wordValidation.invalidWords.length} invalid)</span>
                                    )}
                                </Badge>
                            )}
                            {entry.seed && (() => {
                                const backgroundColor = 
                                    seedValidation.type === 'invalid_checksum' ? '#dc3545' :
                                    seedValidation.type === 'invalid_words' ? '#fd7e14' :
                                    seedValidation.type === 'error' ? '#dc3545' :
                                    seedValidation.isValid ? '#198754' : undefined;
                                
                                const color = 
                                    (seedValidation.type === 'invalid_checksum' || 
                                     seedValidation.type === 'invalid_words' || 
                                     seedValidation.type === 'error' || 
                                     seedValidation.isValid) ? '#ffffff' : undefined;

                                return (
                                    <span 
                                        className="d-flex align-items-center"
                                        style={{
                                            backgroundColor: backgroundColor,
                                            color: color,
                                            border: 'none',
                                            padding: '0.375rem 0.75rem',
                                            fontSize: '0.75rem',
                                            fontWeight: '600',
                                            borderRadius: '0.375rem',
                                            lineHeight: '1'
                                        }}
                                    >
                                        {seedValidation.isValid ? (
                                            <><FaCheck className="me-1" /> {seedValidation.message}</>
                                        ) : (
                                            <><FaExclamationTriangle className="me-1" /> {seedValidation.message}</>
                                        )}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="position-relative">
                        <InputGroup>
                            <Form.Control
                                ref={textareaRef}
                                as="textarea"
                                rows={3}
                                placeholder="Start typing... (12, 15, 18, 21, or 24 words)"
                                value={entry.seed}
                                onChange={(e) => handleFieldChange('seed', e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                className={getFormControlClass(seedValidation)}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                                disabled={entryMode === 'view'}
                                style={{ 
                                    fontFamily: 'monospace',
                                    WebkitTextSecurity: isFieldVisible('seed') ? 'none' : 'disc'
                                }}
                            />
                            <Button 
                                variant="outline-secondary"
                                onClick={() => handleToggleVisibility('seed')}
                            >
                                {isFieldVisible('seed') ? <FaHide /> : <FaEye />}
                            </Button>
                        </InputGroup>
                        
                        {/* Autocomplete dropdown */}
                        {showAutocomplete && autocompleteSuggestions.length > 0 && (
                            <div className="position-absolute w-100" style={{ zIndex: 1000, top: '100%' }}>
                                <ListGroup className="shadow-lg border-0" style={{ 
                                    border: '1px solid #495057',
                                    borderRadius: '0.375rem',
                                    overflow: 'hidden'
                                }}>
                                    {autocompleteSuggestions.map((suggestion, idx) => (
                                        <ListGroup.Item
                                            key={idx}
                                            action
                                            onClick={() => selectAutocomplete(suggestion)}
                                            className="py-2 px-3 d-flex justify-content-between align-items-center border-0"
                                            style={{ 
                                                cursor: 'pointer', 
                                                fontSize: '0.95rem',
                                                backgroundColor: '#2d3748',
                                                color: '#ffffff',
                                                borderBottom: idx < autocompleteSuggestions.length - 1 ? '1px solid #4a5568' : 'none',
                                                transition: 'background-color 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#4a5568';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#2d3748';
                                            }}
                                        >
                                            <span style={{ 
                                                fontFamily: 'monospace', 
                                                fontWeight: '600',
                                                color: '#68d391',
                                                fontSize: '1rem'
                                            }}>
                                                {suggestion}
                                            </span>
                                            <small style={{ 
                                                color: '#a0aec0',
                                                fontWeight: '500'
                                            }}>
                                                #{getBIP39Wordlist().indexOf(suggestion) + 1}
                                            </small>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>
                        )}
                    </div>
                    
                    {/* Enhanced feedback messages */}
                    {entry.seed && !seedValidation.isValid && seedValidation.details && seedValidation.details.length > 0 && (
                        <Form.Text className={seedValidation.type === 'invalid_checksum' ? 'text-danger' : 'text-warning'}>
                            <small>
                                {seedValidation.type === 'invalid_words' && (
                                    <>
                                        <strong>Invalid words:</strong> {seedValidation.details.join(', ')}
                                        <br />
                                        <em>These words are not in the BIP39 wordlist.</em>
                                    </>
                                )}
                                {seedValidation.type === 'invalid_checksum' && (
                                    <div style={{ lineHeight: '1.3' }}>
                                        <strong>Checksum validation failed!</strong>
                                        <br />
                                        <em>All words are valid, but the seed phrase is mathematically incorrect. 
                                        This could be due to words in wrong order, typos, or corruption.</em>
                                    </div>
                                )}
                                {(seedValidation.type === 'error' || seedValidation.type === 'invalid_length') && (
                                    <em>{seedValidation.details[0]}</em>
                                )}
                            </small>
                        </Form.Text>
                    )}
                    
                    {/* Success message for valid seeds */}
                    {entry.seed && seedValidation.isValid && (
                        <Form.Text className="text-success">
                            <small>
                                <strong>✅ Valid BIP39 seed phrase!</strong> Checksum verified.
                            </small>
                        </Form.Text>
                    )}

                    {/* Real-time word validation feedback */}
                    {entry.seed && wordValidation.invalidWords.length > 0 && (
                        <Form.Text className="text-warning">
                            <small>
                                <strong>⚠️ Invalid words:</strong> {wordValidation.invalidWords.map(w => w.word).join(', ')}
                            </small>
                        </Form.Text>
                    )}
                </Form.Group>

                <Form.Group className="mb-2">
                    <div className="d-flex justify-content-between align-items-center">
                        <Form.Label>Private Key <small className="text-muted">(or use seed phrase above)</small></Form.Label>
                        {entry.privateKey && (
                            <div className="d-flex gap-2">
                                {/* Format indicator badge */}
                                {privateKeyValidation.format && (
                                    <Badge bg="info" className="d-flex align-items-center">
                                        {privateKeyValidation.format}
                                    </Badge>
                                )}
                                {/* Validation status badge */}
                                {(() => {
                                    const backgroundColor = 
                                        privateKeyValidation.type === 'invalid_zero' || 
                                        privateKeyValidation.type === 'invalid_max' ||
                                        privateKeyValidation.type === 'invalid_wif' ||
                                        privateKeyValidation.type === 'invalid_base58' ||
                                        privateKeyValidation.type === 'invalid_eth_hex' ||
                                        privateKeyValidation.type === 'invalid_hex_length' ? '#dc3545' :
                                        privateKeyValidation.type === 'too_short' ||
                                        privateKeyValidation.type === 'too_long' ||
                                        privateKeyValidation.type === 'unknown_format' ? '#fd7e14' :
                                        privateKeyValidation.isValid ? '#198754' : undefined;
                                    
                                    const color = backgroundColor ? '#ffffff' : undefined;

                                    return (
                                        <span 
                                            className="d-flex align-items-center"
                                            style={{
                                                backgroundColor: backgroundColor,
                                                color: color,
                                                border: 'none',
                                                padding: '0.375rem 0.75rem',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                borderRadius: '0.375rem',
                                                lineHeight: '1'
                                            }}
                                        >
                                            {privateKeyValidation.isValid ? (
                                                <><FaCheck className="me-1" /> {privateKeyValidation.message}</>
                                            ) : (
                                                <><FaExclamationTriangle className="me-1" /> {privateKeyValidation.message}</>
                                            )}
                                        </span>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                    <InputGroup>
                        <Form.Control
                            type={isFieldVisible('privateKey') ? "text" : "password"}
                            placeholder="Raw hex, WIF, Base58, or 0x prefixed..."
                            value={entry.privateKey}
                            onChange={(e) => handleFieldChange('privateKey', e.target.value)}
                            className={entry.privateKey ? (privateKeyValidation.isValid ? 'is-valid' : 'is-invalid') : ''}
                            disabled={entryMode === 'view'}
                            spellCheck={false}
                            autoCorrect="off"
                            autoCapitalize="off"
                            autoComplete="off"
                            style={{ 
                                fontFamily: 'monospace'
                            }}
                        />
                        <Button 
                            variant="outline-secondary"
                            onClick={() => handleToggleVisibility('privateKey')}
                        >
                            {isFieldVisible('privateKey') ? <FaHide /> : <FaEye />}
                        </Button>
                    </InputGroup>
                    
                    {/* Private key validation feedback */}
                    {entry.privateKey && !privateKeyValidation.isValid && privateKeyValidation.details && privateKeyValidation.details.length > 0 && (
                        <Form.Text className={
                            privateKeyValidation.type === 'invalid_zero' || 
                            privateKeyValidation.type === 'invalid_max' ||
                            privateKeyValidation.type === 'invalid_wif' ||
                            privateKeyValidation.type === 'invalid_base58' ||
                            privateKeyValidation.type === 'invalid_eth_hex' ||
                            privateKeyValidation.type === 'invalid_hex_length' ? 'text-danger' : 'text-warning'
                        }>
                            <small>
                                <strong>
                                    {privateKeyValidation.type === 'invalid_zero' && '🚫 Invalid private key:'}
                                    {privateKeyValidation.type === 'invalid_max' && '🚫 Invalid private key:'}
                                    {privateKeyValidation.type === 'invalid_wif' && '⚠️ WIF format issue:'}
                                    {privateKeyValidation.type === 'invalid_base58' && '⚠️ Base58 issue:'}
                                    {privateKeyValidation.type === 'invalid_eth_hex' && '⚠️ Ethereum format issue:'}
                                    {privateKeyValidation.type === 'invalid_hex_length' && '⚠️ Hex length issue:'}
                                    {privateKeyValidation.type === 'too_short' && '⚠️ Length issue:'}
                                    {privateKeyValidation.type === 'too_long' && '⚠️ Length issue:'}
                                    {privateKeyValidation.type === 'unknown_format' && '❓ Format issue:'}
                                </strong> {privateKeyValidation.details[0]}
                            </small>
                        </Form.Text>
                    )}
                    
                    {/* Success message for valid private keys */}
                    {entry.privateKey && privateKeyValidation.isValid && (
                        <Form.Text className="text-success">
                            <small>
                                <strong>✅ Valid private key!</strong> Format: {privateKeyValidation.format}
                            </small>
                        </Form.Text>
                    )}
                </Form.Group>

                <Form.Group className="mb-2">
                    <Form.Label>Address (optional)</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Wallet address"
                        value={entry.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        disabled={entryMode === 'view'}
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        autoComplete="off"
                    />
                </Form.Group>

                        <Form.Group className="mb-0">
                            <Form.Label>Context Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Purpose of this wallet, backup info, etc..."
                                value={entry.notes}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
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

export default WalletEntryCard; 