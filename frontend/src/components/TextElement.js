import React from 'react';

const TextElement = ({ 
  id,
  content, 
  x, 
  y, 
  fontSize = 40, 
  color = '#000000',
  onDelete
}) => {
  // Ensure we have valid values
  const safeContent = content || '';
  const safeX = typeof x === 'number' ? x : '50%';
  const safeY = typeof y === 'number' ? y : 100;
  const safeFontSize = typeof fontSize === 'number' ? fontSize : 40;
  const safeColor = color || '#000000';

  const style = {
    position: 'absolute',
    left: safeX,
    top: safeY,
    fontSize: `${safeFontSize}px`,
    color: safeColor,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    whiteSpace: 'pre-wrap',
    userSelect: 'text',
    cursor: 'text',
    backgroundColor: 'transparent',
    pointerEvents: 'none', // Allow drawing through text
    padding: '8px 12px',
    borderRadius: '4px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    width: '75%',
    maxWidth: 'none',
    wordWrap: 'break-word',
    transform: typeof x === 'number' ? 'none' : 'translateX(-50%)',
    zIndex: 100
  };

  return (
    <div 
      className="text-element" 
      style={style}
      data-text-id={id}
    >
      {safeContent}
      {onDelete && (
        <button
          onClick={() => onDelete(id)}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#dc3545',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto' // Delete button should be clickable
          }}
          title="Delete text"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default TextElement;
