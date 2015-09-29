'use strict';

function el(type, attrs) {
    var e = document.createElement(type);

    if(attrs) {
        var keys = Object.keys(attrs);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];

            if(key === 'content') {
                e.innerText = attrs[key];
            } else {
                e.setAttribute(key, attrs[key]);   
            }
        }
    }
    return e;
}

function addEl(el) {
    document.body.appendChild(el);
}

function removeEl(el) {
    el.parentNode.removeChild(el);
}