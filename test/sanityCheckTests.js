
'use strict';

casper.test.begin('sanity check', 4, function(test) {
    casper.start('test/template.html', function() {
        test.assertEquals(true, true);
    });

    casper.then(function() {
        test.assertEval(function() {
            var div = document.createElement('div');
            div.id = 'myDiv';
            document.body.appendChild(div);

            return document.getElementById('myDiv') !== null;
        }, 'We interacted with the DOM');
    });

    casper.thenEvaluate(function() {
        var div = document.createElement('div');
        div.id = 'myDiv2';
        document.body.appendChild(div);
    });

    casper.then(function() {
        test.assertEval(function() {
            return document.getElementById('myDiv2') !== null;
        }, 'Async DOM interaction');
    });

    casper.then(function() {
        test.assertEval(function() {
            return typeof(te.mentions) === 'object';
        }, 'te.mentions namespace should be available');
    });

    casper.run(function() {
        test.done();
    });
});
