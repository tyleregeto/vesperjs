
'use strict';

casper.test.begin('list view visible', 5, function(test) {
    casper.start('test/template.html', function() {
        test.assertTitle('test runner template', 'template');
    });

    // Not a test, initiates a new mentionListener
    casper.thenEvaluate(function() {
        addEl(el('textarea', {id: 'myMentions'}));

        te.mentions.newListener('myMentions', {
            data: ['bob', 'bort', 'cat'],
        });
    });

    // If it init'd correctly, there should be a list view in the DOM
    casper.then(function() {
        test.assertExists('.te-mentions-list-results');
    }, 'Mention list view should exist');

    casper.then(function() {
        test.assertNotVisible('.te-mentions-list-results');
    }, 'Mention list view should not be visible');

    casper.then(function() {
        this.sendKeys('textarea', '@b');
        
        // type some letters in, then wait for the menu to become visible,
        // te.mentions debounces display to the next animation frame
        this.waitUntilVisible('.te-mentions-list-results');
    });

    casper.then(function() {
        test.assertVisible('.te-mentions-list-results');
    }, 'Mention list view should be visible after typing');

    // if it has auto completed correctly, there should be two options available
    casper.then(function() {
        test.assertElementCount('.te-mentions-list-results li', 2);
    }, 'Mention list view should have two options');

    casper.run(function() {
        test.done();
    });
});

casper.test.begin('list view hides on target blur', 2, function(test) {
    casper.start('test/template.html');

    // Not a test, initiates a new mentionListener
    casper.thenEvaluate(function() {
        addEl(el('input', {id: 'myInput', type:'text'}));
        addEl(el('textarea', {id: 'myMentions'}));

        te.mentions.newListener('myMentions', {
            data: ['bob', 'bort', 'cat'],
        });
    });

    casper.then(function() {       
        this.sendKeys('textarea', '@b', {keepFocus: true});
        
        // type some letters in, then wait for the menu to become visible,
        // te.mentions debounces display to the next animation frame
        this.waitUntilVisible('.te-mentions-list-results');
    });

    casper.then(function() {
        test.assertVisible('.te-mentions-list-results');

        casper.click('#myInput');
        casper.waitWhileVisible('.te-mentions-list-results');

    }, 'Mention list view should be visible after typing');

    casper.then(function() {
        test.assertNotVisible('.te-mentions-list-results');
    }, 'Mention list view should hide on focus lost');

    casper.run(function() {
        test.done();
    });
});
