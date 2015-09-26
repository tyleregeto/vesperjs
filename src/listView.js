'use strict';

te.mentions.newListView = function(onItemSelect /*func*/, spec) {
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
                // Firefox supports these props currently
                var type = isDown ? 'end' : 'start';
                activeItem.scrollIntoView({block: type, behavior: 'smooth'});
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
