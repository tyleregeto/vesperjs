'use strict';

// TODO after insert, a single back space should remove the last name, a second backspace should remove everything up to the '@' character
// TODO support callback match finding, needs to work with AJAX requests
// TODO iframe support (eg: CKEditor)
// TODO document plugin API and view API and config settings
// TODO expect a className for identifying inserts later

var te = te || {};

te.escapeHtml = function(html) {
    var a = document.createTextNode(html);
    var b = document.createElement('div');
    b.appendChild(a);
    return b.innerHTML;
};

te.parseTemplate = function(data, tmpl, esc) {
    if(typeof(data) === 'string') {
        data = {value: data};
    }

    var keys = Object.keys(data);
    for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        var v = esc ? te.escapeHtml(data[k]) : data[k];
        tmpl = tmpl.replace(new RegExp('{'+k+'}', 'g'), v);
    }
    return tmpl;
};

te.newMentionListener = function(targetNode /*node or ID*/, spec) {
    spec = spec || {};

    var target = null;
    var plugin = null;
    var trigChar = spec.triggerCharacter || '@';
    var insertTmpl = spec.insertTmpl || (trigChar + '{value}');
    var insertEmptySpaceAfter = spec.spaceAfterInsert || false;
    // When looking for @ starts, only look back `maxChar` from the caret position
    var maxChar = spec.maxLen || 20;
    var minChar = spec.minLen || 0;
    var escapeTmpl = spec.escapeTmpls !== false;
    // Note: an empty class name is valid, but you won't be able to edit
    // mentions if the template contains an anchor tag in that case.
    // This is because we can't tell the origin of the anchor tag.
    // var mentionTagClassName = spec.mentionClassName || 'te-mention';
    var view = null;
    var termMatch = null;
    var pluginData = null;

    init();
    
    // return an interface to the mention object
    return {
        destory: destory,
    };

    function init() {
        if(typeof(targetNode) === 'string') {
            targetNode = document.getElementById(targetNode);
        }

        target = targetNode;
        
        if(target.tagName.toLowerCase() === 'textarea') {
            plugin = te.newMentionTextareaPlugin(target);
        } else if(target.hasAttribute('contentEditable') && target.getAttribute('contentEditable') !== 'false') {
            plugin = te.newMentionContentEditablePlugin(target);
        }

        view = spec.view || te.newMentionListView(onMentionSelection, {className: plugin.name});
        target.addEventListener('input', requestAutoComplete);
        target.addEventListener('click', requestAutoComplete);
        target.addEventListener('keydown', onKeyDown);
    }

    function destory() {
        target.removeEventListener('input', requestAutoComplete);
        target.removeEventListener('click', requestAutoComplete);
        target.removeEventListener('keydown', onKeyDown);
        view.destory();
    }

    function onKeyDown(e) {
        var dirtyKeys = {37:1, 38:1, 39:1, 40:0};
        if(dirtyKeys[e.keyCode]) {
            requestAutoComplete();
        }
    }

    function requestAutoComplete() {
        // COMPATIBILITY: IE9 doesn't support this
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(doAutoComplete);
        } else {
            setTimeout(doAutoComplete, 1000 / 30);
        }
    }

    function doAutoComplete() {
        var value = plugin.getValue();

        if(!value) {
            value = {text:'', caretIndex: 0};
        }

        pluginData = value.data;
        termMatch = findTerm(value.text, value.caretIndex);

        if(termMatch) {
            view.setList(findMatches(termMatch.term), plugin.getMenuPosition(termMatch.start));
        } else {
            // clear any existing matches in view
            view.setList([]);
        }
    }

    // called from the view when the user selects a mention
    function onMentionSelection(data) {
        var tag = te.parseTemplate(data, insertTmpl, escapeTmpl);
        plugin.insert(tag, termMatch, insertEmptySpaceAfter, pluginData);
    }

    function findTerm(v, i) {
        var offset = 0;

        // walk backwards over the string looking for the trigger char
        while(offset < maxChar) {
            var part = v.substr(i - offset, offset + 1);

            if(part[0] === trigChar) {
                // we have to be X chars past the trigger char before considering
                // for auto complete
                if(offset <= minChar) {
                    return false;
                }

                // grab from the trigChar up to the caret position 
                var match = v.substr(i - offset + 1, offset - 1);
                // make sure we don't match past another trigger char
                var nextTrigChar = match.indexOf(trigChar);
                if(nextTrigChar !== -1) {
                    match = match.substr(0, nextTrigChar);
                }

                // Make sure we aren't matching backwards
                if(i - offset < 0) {
                    return false;
                }

                return {term:match, start: i - offset, end: i};
            }
            offset++;
        }
        return false;
    }

    function findMatches(term) {
        term = term.toLowerCase();
        var data = spec.data || [];
        var matches = [];
        for (var i = 0; i < data.length; i++) {
            var u = data[i];
            if(u.substr(0, term.length).toLowerCase() === term) {
                matches.push(u);
            }
        }
        return matches;
    }
};

te.newMentionTextareaPlugin = function(textarea) {
    return {
        name: 'te-mention-textarea',
        insert: insert,
        getValue: getValue,
        getMenuPosition: getMenuPosition,
    };

    // get value should return an object with the follow definition:
    // {text: "", caretIndex: 0}
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

te.newMentionContentEditablePlugin = function() {
    return {
        name: 'te-mention-content-editable',
        insert: insert,
        getValue: getValue,
        getMenuPosition: getMenuPosition,
    };

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

        if(anchorNode.parentNode.tagName === 'A') {
            // TODO handle when selectionanchorNode is not text, should probably abort?
            nodeToReplace = anchorNode.parentNode;
            //return false;
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
        range.selectNode(lastNewElement);
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

te.newMentionListView = function(onItemSelect /*func*/, spec) {
    var cursorPos = 0;
    var numItems = 0;
    var items = null;
    var listItems = null;
    var isVisible = false;
    var wrapper = document.createElement('div');
    var list = document.createElement('ul');
    var escapeCloseLength = spec.escapeCloseLength || 3000;
    var rowTmpl = spec.rowTmpl || '{value}';
    var tabSelects = spec.tabSelects !== false;
    var enterSelects = spec.enterSelects !== false;
    var escapeTmpl = spec.escapeTmpls !== false;
    // when the list was last closed by pressing escape (milliseconds)
    var closedAt = 0;

    list.className = 'te-mentions-list-results';
    list.addEventListener('click', onListClick);

    wrapper.className = 'te-mentions-list ' + (spec.className || '');
    wrapper.style.display = 'none';
    wrapper.appendChild(list);

    document.body.appendChild(wrapper);
    window.addEventListener('keydown', onKeyDown, true);

    // return interface
    return {
        setList: setList,
        destroy: destroy,
    };

    function destroy() {
        document.body.removeChild(wrapper);
        window.removeEventListener('keydown', onKeyDown);
    }

    function setList(itemData, position) {
        // TODO this needs to make sure the menu is within screen bounds
        // Pressing escape when the auto complete menu is open hides it
        // for this length of time
        if(Date.now() - closedAt < escapeCloseLength) {
            return;
        }

        items = itemData;
        numItems = itemData.length;
        isVisible = numItems > 0;
        listItems = [];
        cursorPos = 0;

        // clear old matches
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        // if not matches, exit
        if(!isVisible) {
            wrapper.style.display = 'none';
            return;
        }

        wrapper.style.top = position.top + 'px';
        wrapper.style.left = position.left + 'px';
        wrapper.style.display = 'block';

        // add new matches
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var listItem = document.createElement('li');
            listItem.setAttribute('data-te-mention-index', i);

            if(i === 0) {
                listItem.className = 'te-active';
            }

            listItem.innerHTML = te.parseTemplate(item, rowTmpl, escapeTmpl);
            list.appendChild(listItem);
            listItems.push(listItem);
        }
    }

    function moveCusor(index, isDown) {
        var activeItem = null;
        var prevPos = cursorPos;
        cursorPos = index;

        if(cursorPos < 0) {
            cursorPos = 0;
        }
        else if(cursorPos > numItems - 1) {
            cursorPos = numItems - 1;
        }

        if(prevPos === cursorPos) {
            return;
        }

        for (var i = 0; i < listItems.length; i++) {
            if(i === prevPos) {
                listItems[i].className = '';
            } else if(i === cursorPos) {
                activeItem = listItems[i];
                activeItem.className = 'te-active';
            }
        }

        // make sure the active item in scrolled into view
        if(activeItem) {
            // COMPATIBILITY: scrollIntoViewIfNeeded is blink/webkit, No support in Firefox. (IE is unknown)
            // Both work reasonably well, `scrollIntoViewIfNeeded` feels a little nicer
            if(typeof(activeItem.scrollIntoViewIfNeeded) === 'function') {
                activeItem.scrollIntoViewIfNeeded(false);
            } else {
                var d = isDown ? "end" : "start";
                activeItem.scrollIntoView({block: d, behavior: "smooth"});
            }
        }
    }

    function selectItem(i) {
        var item = items[i];
        // clear the current list
        setList([]);
        // insert the selected item
        onItemSelect(item);
    }

    function onKeyDown(e) {
        if(!isVisible) {
            return;
        }

        var handled = false;
        switch(e.keyCode) {
        case 38:
            handled = true;
            moveCusor(cursorPos - 1, true);
            break;
        case 40:
            handled = true;
            moveCusor(cursorPos + 1);
            break;
        case 13:
            if(enterSelects) {
                handled = true;
                selectItem(cursorPos);    
            }
            break;
        case 9:
            if(tabSelects) {
                handled = true;
                selectItem(cursorPos);    
            }
            break;
        case 27:
            // clear the current list
            setList([]);
            // we have to clear before setting this time
            closedAt = Date.now();
            break;
        }

        if(handled) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }

    function onListClick(e) {
        var target = e.target;

        while(target && !target.hasAttribute('data-te-mention-index')) {
            target = target.parentNode;
        }

        if(target) {
            selectItem(parseInt(target.getAttribute('data-te-mention-index'), 10));
        }
        
        e.stopImmediatePropagation();
        e.preventDefault();
    }
};
