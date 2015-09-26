'use strict';

te.mentions.newContentEditablePlugin = function(contentEditable, spec) {
    // Note: an empty class name is valid, but you won't be able to edit
    // mentions if the template contains an anchor tag in that case.
    // This is because we can't tell the origin of the anchor tag.
    var mentionParentClass = spec.mentionParentClass || 'te-mention';
    var style = te.mentions.DeleteStyle;
    // delete style can be 1) everything 2) last letter and revert back to plain text 3) back to first space
    var deleteStyle = spec.deleteStyle || style.All;

    contentEditable.addEventListener('onkeydown', onKeyPress);

    return {
        name: 'te-mention-content-editable',
        insert: insert,
        getValue: getValue,
        getMenuPosition: getMenuPosition,
    };


    function onKeyPress(e) {
        if(deleteStyle === style.All || e.keyCode !== 8) {
            return;
        }

        // TODO check if the next element is a mention tag
        // TODO if mention tag do delete style

        e.preventDefault();
    }

    function getValue() {
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        
        // don't show the menu if a range of characters is selected
        if(!range.collapsed) {
            return false;
        }

        // templates often contain anchor tags, and we don't want to add an anchor
        // as a child of another anchor. If its our anchor we can proceed (it'll get replaced)
        // otherwise just abort
        var anchorNode = sel.anchorNode;
        var nodeToReplace = null;
        var sawAnchorTag = false;
        var node = anchorNode;

        while(node) {
            sawAnchorTag = sawAnchorTag || node.tagName === 'A';

            if(node === contentEditable) {
                break;
            }

            var className = node.className;
            if (className === mentionParentClass) {
                nodeToReplace = node;
            } else if(className && className.indexOf(mentionParentClass) !== -1) {
                var allNames = className.split(' ');
                for (var i = 0; i < allNames.length; i++) {
                    if(allNames[i] === mentionParentClass) {
                        nodeToReplace = node;
                        break;
                    }
                }
            }

            if(nodeToReplace) {
                break;
            }

            node = node.parentNode;
        }

        if(!nodeToReplace && sawAnchorTag) {
            return false;
        }

        var data = {
            range: range,
            anchorNode: anchorNode,
            nodeToReplace: nodeToReplace,
        };

        return {text: sel.anchorNode.textContent, caretIndex: sel.anchorOffset, data: data};
    }

    function insert(tag, metrics, spaceAfterInsert, data) {
        // the mention template we are inserting
        var mention = document.createElement('div');
        mention.innerHTML = tag;
        mention = mention.firstChild;
        mention.contentEditable = false;

        var range = data.range;
        if(data.nodeToReplace) {
            range.selectNode(data.nodeToReplace);  
        } else if(data.anchorNode.nodeType ===  Node.TEXT_NODE) {
            range.setStart(data.anchorNode, metrics.start);
            range.setEnd(data.anchorNode, metrics.end);
        }

        range.deleteContents();
        range.insertNode(mention);

        var lastNewElement = mention;

        if(spaceAfterInsert) {
            lastNewElement = document.createTextNode('\u00A0');
            mention.parentNode.insertBefore(lastNewElement, mention.nextSibling);
        }

        // move the caret to the end of the inserted content
        var sel = window.getSelection();
        sel.removeAllRanges();
        range = document.createRange();
        range.selectNode(lastNewElement.nextSibling);
        range.collapse();
        sel.addRange(range);
    }

    function getMenuPosition(start) {
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        range.cloneRange();
        range.setStart(range.startContainer, start);

        var rect = range.getBoundingClientRect();
        return {top: rect.top + window.scrollY, left: rect.left + window.scrollX};
    }
};
