
'use strict';

casper.test.begin('list view stays in screen bounds test', 2, function(test) {
    var screenWidth = 320;

    casper.start('test/template.html');

    casper.then(function() {
        casper.viewport(screenWidth, 300, function() {
            // new view port is effective
        });
    });

    // Not a test, initiates a new mentionListener
    casper.thenEvaluate(function() {
        addEl(el('div', {id: 'myMentions', contentEditable: true, style: 'width:300px', class: 'te-content-editable'}));

        te.mentions.newListener('myMentions', {
            data: ['bob has a really long name long name', 'bort', 'cat'],
        });
    });

    casper.then(function() {       
        this.sendKeys('#myMentions', 'some text to start first @b', {keepFocus: true});
        
        // type some letters in, then wait for the menu to become visible,
        // te.mentions debounces display to the next animation frame
        this.waitUntilVisible('.te-mentions-list');
    });

    casper.then(function() {
        test.assertVisible('.te-mentions-list');

        var bounds = this.getElementBounds('.te-mentions-list');
        test.assertTrue(bounds.left + bounds.width <= screenWidth);

        this.capture('test/captures/listView.png', {
            top: 0,
            left: 0,
            width: screenWidth,
            height: 400,
        });

    }, 'Mention list view should be in screen bounds');

    
    casper.run(function() {
        test.done();
    });
});
