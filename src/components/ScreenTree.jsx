import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

const ScreenTreeNode = ({ node, level = 0, hiddenArray, onToggle }) => {
    // If the node itself is hidden, or if all its children are hidden
    // For a parent to be considered "visible", it just needs to NOT be in the hiddenArray itself.
    // However, for UX, if a parent is toggled off, we add it AND all its children to the hidden array.
    
    // A node is hidden if its ID is in the hiddenArray
    const isHidden = hiddenArray.includes(node.id);
    const hasChildren = node.children && node.children.length > 0;
    
    // Default expand level 0 and 1
    const [isExpanded, setIsExpanded] = useState(level < 2);

    const handleNodeToggle = (e) => {
        e.stopPropagation();
        onToggle(node, !isHidden);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0.75rem', 
                    paddingLeft: `${level * 1.5 + 0.75}rem`,
                    backgroundColor: isHidden ? 'var(--color-surface)' : 'var(--color-card)',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: hasChildren ? 'pointer' : 'default',
                    transition: 'background-color 0.2s'
                }}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}
            >
                {/* Expander Icon */}
                <div style={{ width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
                    {hasChildren && (
                        isExpanded ? <ChevronDown size={18} color="var(--color-text-muted)" /> : <ChevronRight size={18} color="var(--color-text-muted)" />
                    )}
                </div>

                {/* Node Title */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <span style={{ 
                        fontSize: level === 0 ? '1rem' : '0.9375rem', 
                        fontWeight: level === 0 ? 600 : 500, 
                        color: isHidden ? 'var(--color-text-muted)' : 'var(--color-text)' 
                    }}>
                        {node.title}
                    </span>
                    {node.path && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {node.path}
                        </span>
                    )}
                </div>

                {/* Toggle Switch */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isHidden ? 'var(--color-error)' : 'var(--color-success)' }}>
                        {isHidden ? 'Hidden' : 'Visible'}
                    </span>
                    <div 
                        onClick={handleNodeToggle} 
                        style={{ 
                            width: '40px', 
                            height: '22px', 
                            backgroundColor: !isHidden ? 'var(--color-success)' : 'var(--color-border)', 
                            borderRadius: '12px', 
                            position: 'relative', 
                            cursor: 'pointer', 
                            transition: 'background-color 0.2s' 
                        }}
                    >
                        <div style={{ 
                            width: '18px', 
                            height: '18px', 
                            backgroundColor: 'white', 
                            borderRadius: '50%', 
                            position: 'absolute', 
                            top: '2px', 
                            left: !isHidden ? '20px' : '2px', 
                            transition: 'left 0.2s, box-shadow 0.2s', 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                        }} />
                    </div>
                </div>
            </div>

            {/* Children render */}
            <AnimatePresence initial={false}>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {node.children.map(child => (
                            <ScreenTreeNode 
                                key={child.id} 
                                node={child} 
                                level={level + 1} 
                                hiddenArray={hiddenArray} 
                                onToggle={onToggle} 
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ScreenTree = ({ data, hiddenArray, onToggle }) => {
    return (
        <div style={{ 
            border: '1px solid var(--color-border)', 
            borderRadius: '0.75rem', 
            overflow: 'hidden',
            backgroundColor: 'var(--color-card)',
            boxShadow: 'var(--shadow-sm)'
        }}>
            {data.map(node => (
                <ScreenTreeNode 
                    key={node.id} 
                    node={node} 
                    level={0} 
                    hiddenArray={hiddenArray} 
                    onToggle={onToggle} 
                />
            ))}
        </div>
    );
};

export default ScreenTree;
