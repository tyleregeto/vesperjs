'use strict';

te.mentions.newTextareaPlugin = function(textarea/*, spec*/) {
    return {
        name: 'te-mention-textarea',
        insert: insert,
        getValue: getValue,
        getMenuPosition: getMenuPosition,
    };

    function getValue() {
        return {text: textarea.value, caretIndex: textarea.selectionStart};
    }

    function insert(tag, termMatch, spaceAfterInsert) {
        var val = getValue().text;

        if(spaceAfterInsert) {
            tag = tag + ' ';
        }

        textarea.value = val.slice(0, termMatch.start) + tag + val.slice(termMatch.end);

        var newCaretPos = termMatch.start + tag.length;
        textarea.selectionStart = newCaretPos;
        textarea.selectionEnd = newCaretPos;
    }

    function getMenuPosition(/*start*/) {
        // TODO currently we position it to the text area bottom-left,
        // we should return the real x/y position. We can do this with
        // an (gross) off screen div with the same styles.
        var rect = textarea.getBoundingClientRect();
        return {top: rect.bottom + window.scrollY, left: rect.left + window.scrollX};
    }
};