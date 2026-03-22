import React, { useState, useEffect, useCallback } from 'react'
import { Button, Card } from 'react-bootstrap';
import { FaCheck, FaLock, FaKey, FaWallet, FaStickyNote, FaCode, FaPlus, FaEdit } from 'react-icons/fa';
import { MdWarningAmber } from 'react-icons/md';


import PasswordEntryCard from './PasswordEntryCard';
import WalletEntryCard from './WalletEntryCard';
import NoteEntryCard from './NoteEntryCard';
import ApiKeyEntryCard from './ApiKeyEntryCard';
import CustomEntryCard from './CustomEntryCard';

function SecretDataEntry({
    secretValue,
    setSecret,
    maxSecretChars,
    totalPages,
    isOnline,
    onContinue
}) {

    
    const [structuredData, setStructuredData] = useState({
        passwords: [],
        wallets: [],
        notes: [],
        apiKeys: [],
        freeText: '',
        custom: []
    });

    const [visibleFields, setVisibleFields] = useState({});
    
    const [expandedEntries, setExpandedEntries] = useState({
        passwords: {},
        wallets: {},
        notes: {},
        apiKeys: {},
        custom: {}
    });

    const [entryModes, setEntryModes] = useState({
        passwords: {},
        wallets: {},
        notes: {},
        apiKeys: {},
        custom: {}
    });

    const [, setAddingNewEntry] = useState({
        passwords: false,
        wallets: false,
        notes: false,
        apiKeys: false,
        custom: false
    });

    const getAllItems = () => {
        const allItems = [];

        Object.keys(structuredData).forEach(section => {
            if (section !== 'freeText' && structuredData[section]) {
                structuredData[section].forEach((item, index) => {
                    allItems.push({
                        type: section,
                        index: index,
                        data: item,
                        id: `${section}-${index}`
                    });
                });
            }
        });
        
        return allItems;
    };



    const parseTextToStructured = (text) => {
        if (!text.trim()) {
            return {
                passwords: [],
                wallets: [],
                notes: [],
                apiKeys: [],
                freeText: '',
                custom: []
            };
        }

        try {
            const parsed = JSON.parse(text);
            
            // Initialize valid structure
            const validStructure = {
                passwords: [],
                wallets: [],
                notes: [],
                apiKeys: [],
                freeText: '',
                custom: []
            };



            // Check if this is a flattened array format
            if (Array.isArray(parsed)) {
                // Check if this is a single entry vs multiple entries
                // Single entry: array of primitive values ["service", "username", "password"]
                // Multiple entries: array of arrays [["entry1"], ["entry2"]]
                const isSingleEntry = parsed.length > 0 && 
                    !Array.isArray(parsed[0]);
                
                if (isSingleEntry) {
                    // Single entry format: ["service", "username", "password", ...]
                    const detectedType = detectEntryType(parsed);
                    validStructure[detectedType] = [convertToEntry(parsed, detectedType)];
                } else {
                    // Multiple entries format: [["entry1"], ["entry2"], ...]
                    if (parsed.length > 0) {
                        const firstEntry = parsed[0];
                        const detectedType = detectEntryType(firstEntry);
                        
                        // Convert the entries to the detected section
                        validStructure[detectedType] = parsed.map(entryData => {
                            return convertToEntry(entryData, detectedType);
                        });
                    }
                }
                
                return validStructure;
            }

            // Handle normal categorized format
            Object.keys(validStructure).forEach(section => {
                if (section === 'freeText') {
                    // Handle freeText as string
                    if (typeof parsed[section] === 'string') {
                        validStructure[section] = parsed[section];
                    }
                } else if (parsed[section] && Array.isArray(parsed[section])) {
                    validStructure[section] = parsed[section].map(entryData => {
                        return convertToEntry(entryData, section);
                    });
                }
            });

            return validStructure;
        } catch (error) {
            // If parsing fails, return null to indicate invalid JSON
            return null;
        }
    };

    // Helper function to detect entry type from array content
    const detectEntryType = (entryData) => {
        // Only handle array format now
        if (Array.isArray(entryData)) {
            if (entryData.length === 1) {
                return 'custom'; // Single value, treat as custom
            } else if (entryData.length === 2) {
                return 'notes'; // Two values: [title, content]
            } else if (entryData.length >= 3) {
                return detectTypeFromValues(entryData);
            }
        }
        
        return 'custom'; // default fallback
    };

    // Helper function to detect type from field values
    const detectTypeFromValues = (values) => {
        // Look for common patterns to distinguish types
        const hasEmailPattern = values.some(field => 
            typeof field === 'string' && field.includes('@')
        );
        const hasSeedPattern = values.some(field => 
            typeof field === 'string' && 
            (field.includes('seed') || field.split(' ').length >= 12)
        );
        const hasKeyPattern = values.some(field => 
            typeof field === 'string' && 
            (field.toLowerCase().includes('key') || field.toLowerCase().includes('token'))
        );
        
        if (hasSeedPattern) {
            return 'wallets';
        } else if (hasKeyPattern) {
            return 'apiKeys';
        } else if (hasEmailPattern) {
            return 'passwords';
        } else {
            return values.length === 3 ? 'custom' : 'passwords';
        }
    };

    // Helper function to convert positional array back to entry object  
    const convertToEntry = (entryData, section) => {
        // Handle positional array format - fill in order, preserving field positions
        if (Array.isArray(entryData)) {
            switch (section) {
                case 'passwords':
                    // Fill in order: [service, username, password, url, notes]
                    return {
                        service: entryData[0] || '',
                        username: entryData[1] || '',
                        password: entryData[2] || '',
                        url: entryData[3] || '',
                        notes: entryData[4] || ''
                    };
                case 'wallets':
                    // Fill in order: [name, seed, privateKey, address, notes]
                    return {
                        name: entryData[0] || '',
                        seed: entryData[1] || '',
                        privateKey: entryData[2] || '',
                        address: entryData[3] || '',
                        notes: entryData[4] || ''
                    };
                case 'notes':
                    // Fill in order: [title, content]
                    return {
                        title: entryData[0] || '',
                        content: entryData[1] || ''
                    };
                case 'apiKeys':
                    // Fill in order: [service, key, secret, notes]
                    return {
                        service: entryData[0] || '',
                        key: entryData[1] || '',
                        secret: entryData[2] || '',
                        notes: entryData[3] || ''
                    };
                case 'custom':
                    // Fill in order: [label, value, notes]
                    return {
                        label: entryData[0] || '',
                        value: entryData[1] || '',
                        notes: entryData[2] || ''
                    };
                default:
                    return {};
            }
        }
        
        return {};
    };

    // Convert structured data to compact array format (saves characters)
    const convertToText = useCallback(() => {
        // Convert to compact array format
        const cleanData = {};
        const sectionsWithData = [];
        
        Object.keys(structuredData).forEach(section => {
            if (section === 'freeText') {
                // Handle freeText as string
                if (structuredData.freeText && structuredData.freeText.trim()) {
                    cleanData.freeText = structuredData.freeText;
                    sectionsWithData.push('freeText');
                }
                return;
            }
            
            if (structuredData[section].length > 0) {
                const entries = structuredData[section].map(entry => {
                    // Helper function to create array that preserves field positioning
                    // Only trims trailing empty fields to maintain UX while saving some space
                    const createPositionalArray = (fields) => {
                        // Find the last non-empty field index to preserve positioning
                        let lastNonEmptyIndex = -1;
                        for (let i = fields.length - 1; i >= 0; i--) {
                            if (fields[i] && fields[i].trim() !== '') {
                                lastNonEmptyIndex = i;
                                break;
                            }
                        }
                        
                        // If no non-empty fields, return null
                        if (lastNonEmptyIndex === -1) {
                            return null;
                        }
                        
                        // Return array up to last non-empty field (preserves middle empty fields)
                        return fields.slice(0, lastNonEmptyIndex + 1);
                    };

                    // Convert object to positional array format - preserves field positioning
                    switch (section) {
                        case 'passwords':
                            // [service, username, password, url, notes] - preserve middle empty fields
                            return createPositionalArray([
                                entry.service || '',
                                entry.username || '',
                                entry.password || '',
                                entry.url || '',
                                entry.notes || ''
                            ]);
                        case 'wallets':
                            // [name, seed, privateKey, address, notes] - preserve middle empty fields
                            return createPositionalArray([
                                entry.name || '',
                                entry.seed || '',
                                entry.privateKey || '',
                                entry.address || '',
                                entry.notes || ''
                            ]);
                        case 'notes':
                            // [title, content] - preserve middle empty fields
                            return createPositionalArray([
                                entry.title || '',
                                entry.content || ''
                            ]);
                        case 'apiKeys':
                            // [service, key, secret, notes] - preserve middle empty fields
                            return createPositionalArray([
                                entry.service || '',
                                entry.key || '',
                                entry.secret || '',
                                entry.notes || ''
                            ]);
                        case 'custom':
                            // [label, value, notes] - preserve middle empty fields
                            return createPositionalArray([
                                entry.label || '',
                                entry.value || '',
                                entry.notes || ''
                            ]);
                        default:
                            return null;
                    }
                }).filter(arr => arr !== null); // Only include non-empty arrays
                
                if (entries.length > 0) {
                    cleanData[section] = entries;
                    sectionsWithData.push(section);
                }
            }
        });
        
        // OPTIMIZATION: If only one section has data (and no freeText), return just the array
        const nonFreeTextSections = sectionsWithData.filter(s => s !== 'freeText');
        if (nonFreeTextSections.length === 1 && !cleanData.freeText) {
            const singleSection = nonFreeTextSections[0];
            const sectionData = cleanData[singleSection];
            
            // FURTHER OPTIMIZATION: If only one entry in the single section, return just that entry
            if (sectionData.length === 1) {
                return JSON.stringify(sectionData[0]);
            } else {
                return JSON.stringify(sectionData);
            }
        }
        
        // Return compact JSON (no spaces) to save characters
        return Object.keys(cleanData).length > 0 ? JSON.stringify(cleanData) : '';
    }, [structuredData]);

    // Calculate current character usage (unified mode)
    const getCurrentText = () => {
        return convertToText();
    };

    // Get compressed version for final storage (removes empty values completely)
    const getCompressedText = () => {
        return convertToCompressedText();
    };

    // Convert structured data to ultra-compact format (removes all empty values)
    const convertToCompressedText = useCallback(() => {
        // Convert to ultra-compact format by removing all empty values
        const cleanData = {};
        const sectionsWithData = [];
        
        Object.keys(structuredData).forEach(section => {
            if (section === 'freeText') {
                // Handle freeText as string
                if (structuredData.freeText && structuredData.freeText.trim()) {
                    cleanData.freeText = structuredData.freeText;
                    sectionsWithData.push('freeText');
                }
                return;
            }
            
            if (structuredData[section].length > 0) {
                const entries = structuredData[section].map(entry => {
                    // Helper function to create ultra-compact array - removes ALL empty values
                    const createUltraCompactArray = (fields) => {
                        const result = [];
                        fields.forEach(value => {
                            if (value && value.trim() !== '') {
                                result.push(value);
                            }
                        });
                        return result.length > 0 ? result : null;
                    };

                    // Convert object to ultra-compact format - no empty values at all
                    switch (section) {
                        case 'passwords':
                            return createUltraCompactArray([
                                entry.service || '',
                                entry.username || '',
                                entry.password || '',
                                entry.url || '',
                                entry.notes || ''
                            ]);
                        case 'wallets':
                            return createUltraCompactArray([
                                entry.name || '',
                                entry.seed || '',
                                entry.privateKey || '',
                                entry.address || '',
                                entry.notes || ''
                            ]);
                        case 'notes':
                            return createUltraCompactArray([
                                entry.title || '',
                                entry.content || ''
                            ]);
                        case 'apiKeys':
                            return createUltraCompactArray([
                                entry.service || '',
                                entry.key || '',
                                entry.secret || '',
                                entry.notes || ''
                            ]);
                        case 'custom':
                            return createUltraCompactArray([
                                entry.label || '',
                                entry.value || '',
                                entry.notes || ''
                            ]);
                        default:
                            return null;
                    }
                }).filter(arr => arr !== null); // Only include non-empty arrays
                
                if (entries.length > 0) {
                    cleanData[section] = entries;
                    sectionsWithData.push(section);
                }
            }
        });
        
        // OPTIMIZATION: If only one section has data (and no freeText), return just the array
        const nonFreeTextSections = sectionsWithData.filter(s => s !== 'freeText');
        if (nonFreeTextSections.length === 1 && !cleanData.freeText) {
            const singleSection = nonFreeTextSections[0];
            const sectionData = cleanData[singleSection];
            
            // FURTHER OPTIMIZATION: If only one entry in the single section, return just that entry
            if (sectionData.length === 1) {
                return JSON.stringify(sectionData[0]);
            } else {
                return JSON.stringify(sectionData);
            }
        }
        
        // Return compact JSON (no spaces) to save characters
        return Object.keys(cleanData).length > 0 ? JSON.stringify(cleanData) : '';
    }, [structuredData]);

    // Count only user content, not JSON structure overhead
    const getUserContentLength = () => {
        let totalLength = 0;
        
        // Count characters in structured data entries
        Object.keys(structuredData).forEach(section => {
            if (section === 'freeText') {
                // Free text counts directly
                totalLength += (structuredData.freeText || '').length;
            } else if (structuredData[section] && Array.isArray(structuredData[section])) {
                // Count characters in each entry's fields
                structuredData[section].forEach(entry => {
                    Object.values(entry).forEach(value => {
                        if (typeof value === 'string' && value) {
                            totalLength += value.length;
                        }
                    });
                });
            }
        });
        
        return totalLength;
    };

    const currentText = getCurrentText();
    const currentCharCount = getUserContentLength();
    const remainingChars = maxSecretChars - currentCharCount;
    const isOverLimit = remainingChars < 0;

    // Only disable adding when actually over the limit
    const canAddNewEntry = () => {
        return remainingChars >= 0; // Only disable if over limit
    };

    // Initialize structured data from secret value on component load
    useEffect(() => {
        if (secretValue && secretValue.trim()) {
            const parsed = parseTextToStructured(secretValue);
            if (parsed) {
                setStructuredData(parsed);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
    }, []);

    // Update the main secret value when structured data changes
    useEffect(() => {
        const formattedText = convertToText();
        setSecret(formattedText);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- setSecret stable from parent
    }, [structuredData, convertToText]);

    const toggleFieldVisibility = (section, index, field) => {
        const key = `${section}-${index}-${field}`;
        setVisibleFields(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const isFieldVisible = (section, index, field) => {
        const key = `${section}-${index}-${field}`;
        return visibleFields[key] || false;
    };

    // eslint-disable-next-line no-unused-vars -- reserved for add-entry flow
    const startAddingEntry = (section) => {
        // Mark that we're adding a new entry to this section
        setAddingNewEntry(prev => ({
            ...prev,
            [section]: true
        }));
    };

    // Add new item by type (unified approach)
    const addNewItem = (itemType) => {
        confirmAddEntry(itemType);
    };

    const confirmAddEntry = (section) => {
        let newEntry = {};
        switch (section) {
            case 'passwords':
                newEntry = { service: '', username: '', password: '', url: '', notes: '' };
                break;
            case 'wallets':
                newEntry = { name: '', seed: '', privateKey: '', address: '', notes: '' };
                break;
            case 'notes':
                newEntry = { title: '', content: '' };
                break;
            case 'apiKeys':
                newEntry = { service: '', key: '', secret: '', notes: '' };
                break;
            case 'custom':
                newEntry = { label: '', value: '', notes: '' };
                break;
            default:
                break;
        }
        
        setStructuredData(prev => {
            const updated = {
                ...prev,
                [section]: [...prev[section], newEntry]
            };
            
            // Auto-expand the new entry and set it to edit mode
            const newIndex = updated[section].length - 1;
            setExpandedEntries(prevExpanded => ({
                ...prevExpanded,
                [section]: {
                    ...prevExpanded[section],
                    [newIndex]: true
                }
            }));

            // Set new entry to edit mode
            setEntryModes(prevModes => ({
                ...prevModes,
                [section]: {
                    ...prevModes[section],
                    [newIndex]: 'edit'
                }
            }));
            
            return updated;
        });

        // Stop the adding state
        setAddingNewEntry(prev => ({
            ...prev,
            [section]: false
        }));
    };

    // eslint-disable-next-line no-unused-vars -- reserved for cancel flow
    const _cancelAddEntry = (section) => {
        setAddingNewEntry(prev => ({
            ...prev,
            [section]: false
        }));
    };

    const removeEntry = (section, index) => {
        setStructuredData(prev => ({
            ...prev,
            [section]: prev[section].filter((_, i) => i !== index)
        }));

        // Clean up entry modes and expanded states for this index
        setEntryModes(prevModes => {
            const newModes = { ...prevModes };
            const sectionModes = { ...newModes[section] };
            
            // Remove the deleted entry and shift down higher indices
            delete sectionModes[index];
            Object.keys(sectionModes).forEach(key => {
                const keyIndex = parseInt(key);
                if (keyIndex > index) {
                    sectionModes[keyIndex - 1] = sectionModes[keyIndex];
                    delete sectionModes[keyIndex];
                }
            });
            
            newModes[section] = sectionModes;
            return newModes;
        });

        setExpandedEntries(prevExpanded => {
            const newExpanded = { ...prevExpanded };
            const sectionExpanded = { ...newExpanded[section] };
            
            // Remove the deleted entry and shift down higher indices
            delete sectionExpanded[index];
            Object.keys(sectionExpanded).forEach(key => {
                const keyIndex = parseInt(key);
                if (keyIndex > index) {
                    sectionExpanded[keyIndex - 1] = sectionExpanded[keyIndex];
                    delete sectionExpanded[keyIndex];
                }
            });
            
            newExpanded[section] = sectionExpanded;
            return newExpanded;
        });
    };

    const updateEntry = (section, index, field, value) => {
        setStructuredData(prev => ({
            ...prev,
            [section]: prev[section].map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    // Helper functions for entry cards
    const getFieldVisibilityForEntry = (section, index) => (field) => {
        return isFieldVisible(section, index, field);
    };

    const getToggleVisibilityForEntry = (section, index) => (field) => {
        toggleFieldVisibility(section, index, field);
    };

    const getUpdateEntryForSection = (section) => (index, field, value) => {
        updateEntry(section, index, field, value);
    };

    const getRemoveEntryForSection = (section) => (index) => {
        removeEntry(section, index);
    };

    // Accordion management functions
    const toggleEntryExpanded = (section, index) => {
        setExpandedEntries(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [index]: !prev[section][index]
            }
        }));
    };

    const isEntryExpanded = (section, index) => {
        return expandedEntries[section][index] || false;
    };

    const getToggleExpandedForSection = (section) => (index) => {
        toggleEntryExpanded(section, index);
    };

    // Entry mode management
    const setEntryMode = (section, index, mode) => {
        setEntryModes(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [index]: mode
            }
        }));
    };

    const getEntryMode = (section, index) => {
        return entryModes[section][index] || 'view';
    };

    const saveEntry = (section, index) => {
        setEntryMode(section, index, 'view');
        // Collapse the entry after saving
        setExpandedEntries(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [index]: false
            }
        }));
    };

    const cancelEditEntry = (section, index) => {
        // If this is a new entry with no content, remove it
        const entry = structuredData[section][index];
        const hasContent = Object.values(entry).some(value => value && value.trim() !== '');
        
        if (!hasContent) {
            removeEntry(section, index);
        } else {
            setEntryMode(section, index, 'view');
            setExpandedEntries(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [index]: false
                }
            }));
        }
    };

    const editEntry = (section, index) => {
        setEntryMode(section, index, 'edit');
        // Expand the entry when editing
        setExpandedEntries(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [index]: true
            }
        }));
    };

    // Bulk accordion actions
    // eslint-disable-next-line no-unused-vars -- reserved for expand-all
    const _expandAllInSection = (section) => {
        const newExpanded = {};
        structuredData[section].forEach((_, index) => {
            newExpanded[index] = true;
        });
        setExpandedEntries(prev => ({
            ...prev,
            [section]: newExpanded
        }));
    };

    // eslint-disable-next-line no-unused-vars -- reserved for collapse-all
    const _collapseAllInSection = (section) => {
        setExpandedEntries(prev => ({
            ...prev,
            [section]: {}
        }));
    };

    // Update free text content
    const updateFreeText = (value) => {
        setStructuredData(prev => ({
            ...prev,
            freeText: value
        }));
    };

    // Render entry card based on type
    const renderEntryCard = (item) => {
        const { type, index, data, id } = item;
        
        const commonProps = {
            key: id,
            entry: data,
            index: index,
            onUpdate: getUpdateEntryForSection(type),
            onRemove: getRemoveEntryForSection(type),
            isExpanded: isEntryExpanded(type, index),
            onToggleExpanded: getToggleExpandedForSection(type),
            entryMode: getEntryMode(type, index),
            onSave: () => saveEntry(type, index),
            onCancel: () => cancelEditEntry(type, index),
            onEdit: () => editEntry(type, index)
        };

        switch (type) {
            case 'passwords':
                return (
                    <PasswordEntryCard
                        {...commonProps}
                        isFieldVisible={getFieldVisibilityForEntry(type, index)}
                        onToggleVisibility={getToggleVisibilityForEntry(type, index)}
                    />
                );
            case 'wallets':
                return (
                    <WalletEntryCard
                        {...commonProps}
                        isFieldVisible={getFieldVisibilityForEntry(type, index)}
                        onToggleVisibility={getToggleVisibilityForEntry(type, index)}
                    />
                );
            case 'notes':
                return <NoteEntryCard {...commonProps} />;
            case 'apiKeys':
                return (
                    <ApiKeyEntryCard
                        {...commonProps}
                        isFieldVisible={getFieldVisibilityForEntry(type, index)}
                        onToggleVisibility={getToggleVisibilityForEntry(type, index)}
                    />
                );
            case 'custom':
                return (
                    <CustomEntryCard
                        {...commonProps}
                        isFieldVisible={getFieldVisibilityForEntry(type, index)}
                        onToggleVisibility={getToggleVisibilityForEntry(type, index)}
                    />
                );
            default:
                return null;
        }
    };





    // Main tabbed interface
    return (
        <div className={'createWrapper'}>
            {/* Compact Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                    <FaLock className="me-2" style={{fontSize: 18, color: '#e5e5e5'}} />
                    <div>
                        <h4 className="mb-0" style={{color: '#e5e5e5'}}>Build Your Vault</h4>
                        <small style={{color: !isOnline ? '#4caf50' : '#ff9800'}}>
                            {!isOnline ? (
                                <><FaCheck className="me-1" style={{fontSize: 10}} />Offline - secure mode</>
                            ) : (
                                <><MdWarningAmber className="me-1" style={{fontSize: 12}} />Online - disconnect for security</>
                            )}
                        </small>
                    </div>
                </div>
                <div className="text-end">
                    <div className="d-flex align-items-center justify-content-end gap-2">
                        {isOverLimit && (
                            <span className="text-danger small">Over limit!</span>
                        )}
                        <div className={`badge ${isOverLimit ? 'bg-danger' : 'bg-success'} fs-6`}>
                            {currentCharCount} / {maxSecretChars} chars
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Cards */}
            <div className="add-item-cards mb-4">
                <div className="row g-2">
                    <div className="col">
                        <button 
                            className="action-card"
                            onClick={() => addNewItem('passwords')}
                            disabled={!canAddNewEntry()}
                        >
                            <FaKey className="action-icon" />
                            <span className="action-label">Password</span>
                        </button>
                    </div>
                    <div className="col">
                        <button 
                            className="action-card"
                            onClick={() => addNewItem('wallets')}
                            disabled={!canAddNewEntry()}
                        >
                            <FaWallet className="action-icon" />
                            <span className="action-label">Wallet</span>
                        </button>
                    </div>
                    <div className="col">
                        <button 
                            className="action-card"
                            onClick={() => addNewItem('notes')}
                            disabled={!canAddNewEntry()}
                        >
                            <FaStickyNote className="action-icon" />
                            <span className="action-label">Note</span>
                        </button>
                    </div>
                    <div className="col">
                        <button 
                            className="action-card"
                            onClick={() => addNewItem('apiKeys')}
                            disabled={!canAddNewEntry()}
                        >
                            <FaCode className="action-icon" />
                            <span className="action-label">API Key</span>
                        </button>
                    </div>
                    <div className="col">
                        <button 
                            className="action-card"
                            onClick={() => addNewItem('custom')}
                            disabled={!canAddNewEntry()}
                        >
                            <FaPlus className="action-icon" />
                            <span className="action-label">Custom</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Items List */}
            <div className="items-list">
                {getAllItems().length === 0 && !structuredData.freeText ? (
                    <div className="text-center py-5 text-muted">
                        <FaLock size={48} className="mb-3 opacity-50" />
                        <h5>Your vault is empty</h5>
                        <p>Click an item type above to start storing your sensitive data</p>
                    </div>
                ) : (
                    <>
                        {getAllItems().map(item => renderEntryCard(item))}
                    </>
                )}
            </div>

            {/* Free Text Section - only show if there's existing content */}
            {structuredData.freeText && (
                <Card className="mb-4 section-card">
                    <Card.Header>
                        <div className="d-flex align-items-center">
                            <FaEdit className="me-2" />
                            <h5 className="mb-0">Additional Notes</h5>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <div className="data-entry-section">
                            <textarea
                                value={structuredData.freeText}
                                onChange={(e) => updateFreeText(e.target.value)}
                                className={'form-control secretTextInput'}
                                placeholder={'Enter any additional notes or unstructured text here...'}
                                rows={6}
                                spellCheck={false}
                                autoCorrect="off"
                                autoCapitalize="off"
                                autoComplete="off"
                                style={{
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid #333333',
                                    color: '#e5e5e5',
                                    fontSize: '14px'
                                }}
                            />
                        </div>
                    </Card.Body>
                </Card>
            )}

            <div className="continue-section">
                {currentText.trim() && !isOverLimit ? (
                    <Button 
                        variant={'primary'} 
                        size={'lg'}
                        onClick={() => {
                            const compressedText = getCompressedText();
                            onContinue(compressedText);
                        }}
                        className="continue-btn"
                    >
                        Continue
                    </Button>
                ) : (
                    <>
                        <Button 
                            variant={'primary'} 
                            size={'lg'}
                            className="continue-btn"
                            disabled
                        >
                            Continue
                        </Button>
                        <p className="continue-note">
                            {!currentText.trim() 
                                ? "Add some secret data to continue" 
                                : isOverLimit 
                                ? "Reduce data size to continue" 
                                : "Add some secret data to continue"
                            }
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default SecretDataEntry; 