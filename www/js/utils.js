/**
 *
 * @type {{formToJson, staticMethod}}
 */
var Utils = (function() {

    function animate($el, classAnimation) {
        $el.addClass(classAnimation + ' animated').one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function(){
            $(this).removeClass(classAnimation + ' animated');
        });
    };

    function serializeForm($form) {
        var obj = {}
        var array = $form.serializeArray();
        var pattern = /[a-z0-9_]+|(?=\[\])/gi; // This is magic. I found it on StackOverflow lol.
        for(var i = 0; i < array.length; i++) {
            var keys = (array[i].name).match(pattern); // Transform 'toto[tata][blublu]' into ['toto','tata','blublu']
            var curObj = obj;
            while((key = keys.shift()) !== undefined) {
                if(keys.length === 0) {
                    curObj[key] = array[i].value;
                } else {
                    if(!curObj.hasOwnProperty(key)) {
                        curObj[key] = {};
                    }
                    curObj = curObj[key];
                }
            }
        }
        return obj;
    }

    function populateForm($form, obj) {
        var inputs = $form.find(':input');
        var pattern = /[a-z0-9_]+|(?=\[\])/gi;
        for(var i = 0; i < inputs.length; i++) {
            var name = $(inputs[i]).attr('name');
            if (name === undefined) {
                continue;
            }
            var keys = name.match(pattern);
            var curObj = obj;
            var undefinedProperty = false;
            while((key = keys.shift()) !== undefined) {
                if(!curObj.hasOwnProperty(key)) {
                    undefinedProperty = true;
                    break;
                }
                curObj = curObj[key];
            }
            if(!undefinedProperty) {
                populateInput($(inputs[i]), curObj);
            }
        }
    }

    function populateInput($input, value) {
        if ($input.is(':radio')) {
            if($input.val() === value) {
                $input.prop('checked', true);
            }
        } else if($input.is('select')) {
            $input.attr('selected', false);
            $input.find('[value="' + value + '"]').prop('selected', true);
        } else {
            $input.val(value);
        }
    }

    function departureStr(term, academicYear) {
        return ((term === 1) ? 'Septembre' : 'Février') + ' ' + academicYear;
    }

    function handleStateClass(state) {
        switch(state) {
            case 'Créée':
                return 'state-created';
            case 'En préparation':
                return 'state-in-preparation';
            case 'A payer':
                return 'state-to-be-paid';
            case 'En cours':
                return 'state-in-progress';
            case 'Solde à payer':
                return 'state-balance-to-be-paid';
            case 'Terminée':
                return 'state-closed';
            default:
                return 'state-cancelled';
        }
    }

    // Public API
    return {
        animate: animate,
        serializeForm: serializeForm,
        populateForm: populateForm,
        departureStr: departureStr,
        handleStateClass: handleStateClass
    }

})();