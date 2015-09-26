'use strict';

var te = te || {};
te.mentions = {};

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

te.mentions.DeleteStyle = {
    All: 0,
    Text: 1,
    Spaces: 2,
};

te.mentions.newListener = function(targetNode /*node or ID*/, spec) {
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
    var view = null;
    var termMatch = null;
    var pluginData = null;
    // de-bounce auto complete tests 
    var autoCompleteRequested = false;
    var mentionData = spec.data || [];
    var dataIsExternal = typeof(mentionData) === 'function';
    var dataCache = {};

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
            plugin = te.mentions.newTextareaPlugin(target, spec);
        } else if(target.hasAttribute('contentEditable') && target.getAttribute('contentEditable') !== 'false') {
            plugin = te.mentions.newContentEditablePlugin(target, spec);
        }

        view = spec.view || te.mentions.newListView(onMentionSelection, {className: plugin.name});
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
        if(autoCompleteRequested) return;
        autoCompleteRequested = true;
        // COMPATIBILITY: IE9 doesn't support this
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(doAutoComplete);
        } else {
            setTimeout(doAutoComplete, 1000 / 30);
        }
    }

    function doAutoComplete() {
        autoCompleteRequested = false;
        var value = plugin.getValue();

        if(!value) {
            value = {text:'', caretIndex: 0};
        }

        pluginData = value.data;
        termMatch = findTerm(value.text, value.caretIndex);

        if(termMatch) {
            var term = termMatch.term;

            if(dataIsExternal) {
                // check the cache first
                if(Array.isArray(dataCache[term])) {
                    view.setList(findMatches(term, dataCache[term]), plugin.getMenuPosition(termMatch.start));
                } else if(dataCache[term] === undefined) {
                    // give it a value to indicate that it has been requested
                    // this is to prevent multiple requests for the same term
                    dataCache[term] = false;
                    mentionData(term, onMentionData.bind(this, term));
                    view.setList(findClosestMatchingData(term), plugin.getMenuPosition(termMatch.start));
                } else {
                    view.setList(findClosestMatchingData(term), plugin.getMenuPosition(termMatch.start));
                }
            } else {
                view.setList(findMatches(term, mentionData), plugin.getMenuPosition(termMatch.start));
            }
        } else {
            // clear any existing matches in view
            view.setList([]);
        }
    }

    function findClosestMatchingData(term) {
        var t = term;
        while(t.length > 0) {
            if(dataCache[t]) {
                // This version filters them, may be worth exploring with config settings: return findMatches(term, dataCache[t]);
                return term, dataCache[t];
            }
            t = t.substr(0, t.length - 1);
        }
        return [];
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

    function findMatches(term, data) {
        term = term.toLowerCase();
        var matches = [];
        for (var i = 0; i < data.length; i++) {
            var u = data[i];
            if(u.substr(0, term.length).toLowerCase() === term) {
                matches.push(u);
            }
        }
        return matches;
    }

    function onMentionData(term, data) {
        dataCache[term] = data;
        requestAutoComplete();
    }
};
