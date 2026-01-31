"use client";

import React from "react";

// Format inline markdown text (bold, italic, code)
const formatInlineText = (text) => {
  const parts = [];
  let lastIndex = 0;

  // Match **bold**, *italic*, and `code`
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      // Bold text
      parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
    } else if (match[2]) {
      // Italic text
      parts.push(<em key={`italic-${match.index}`}>{match[2]}</em>);
    } else if (match[3]) {
      // Code text
      parts.push(
        <code key={`code-${match.index}`} className="chat-inline-code">
          {match[3]}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// Format message text with markdown-like support
const formatMessage = (text) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for heading
    const headingMatch = line.match(/^#+\s+(.*)$/);
    if (headingMatch) {
      const level = line.match(/^#+/)[0].length;
      const headingText = headingMatch[1];
      const headingClass = `chat-heading-${level}`;
      elements.push(
        <h4 key={`heading-${i}`} className={headingClass}>
          {formatInlineText(headingText)}
        </h4>
      );
      i++;
      continue;
    }

    // Check for list item
    if (line.trim().match(/^[-•*]\s/) || line.trim().match(/^\d+\.\s/)) {
      const listItems = [];
      while (
        i < lines.length &&
        (lines[i].trim().match(/^[-•*]\s/) || lines[i].trim().match(/^\d+\.\s/))
      ) {
        const itemText = lines[i].replace(/^[-•*\d.]\s*/, "").trim();
        listItems.push(
          <li key={`list-item-${i}`} className="chat-list-item">
            {formatInlineText(itemText)}
          </li>
        );
        i++;
      }
      elements.push(
        <ul key={`list-${i}`} className="chat-list">
          {listItems}
        </ul>
      );
      continue;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <p key={`para-${i}`} className="chat-paragraph">
          {formatInlineText(line.trim())}
        </p>
      );
    }

    i++;
  }

  return elements;
};

export default function ChatMessage({ message, isUser }) {
  return (
    <div
      className={`chat-message-container ${isUser ? "user-side" : "bot-side"}`}
    >
      <div
        className={`chat-message-bubble ${
          isUser ? "user-message" : "bot-message"
        }`}
      >
        {isUser ? (
          <div className="message-content user-text">{message}</div>
        ) : (
          <div className="message-content bot-text">
            {formatMessage(message)}
          </div>
        )}
      </div>
    </div>
  );
}
