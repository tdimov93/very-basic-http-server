'use strict';
// Global variables
var app;
var FunnyMode;
(function() {

    var App = function() {

        // Const variables
        var ROLE_PROFESSOR = 'Professor';
        var ROLE_STUDENT = 'Student';
        var API_URL = '/api/1.0';

        // Private attributes
        var user;
        var appName = 'StudentExchangeTools';

        // Getters & Setters
        function getAppName() {
            return appName;
        }

        function getUser() {
            return user;
        }

        function setUser(userl) {
            user = userl;
        }

        function init() {
            getSession();
        }

        function isStudent() {
            return user !== undefined && user.role === ROLE_STUDENT;
        }

        function isProfessor() {
            return user !== undefined && user.role === ROLE_PROFESSOR;
        }

        function getSession() {
            var currentPath = window.location.pathname;
            $.ajax({
                url: API_URL + '/session',
                success: function(resp) {
                    setUser(resp);
                    Router.navigate(currentPath);
                },
                error: function() {
                    Router.navigate(currentPath);
                }
            });
        }

        return {
            API_URL: API_URL,
            start: init,
            getAppName: getAppName,
            getUser: getUser,
            setUser: setUser,
            isStudent: isStudent,
            isProfessor: isProfessor
        }
    };

    var dataTableStrings = {
        sSearch: '',
        oPaginate: {
            sPrevious: 'Précédent',
            sNext: 'Suivant'
        },
        sEmptyTable: 'Il n\'y a pas de données à afficher'
    };

    var SigninView = (function() {

        // Cache DOM
        var $el = $('#signin-view');
        var $form = $el.find('form');
        var $alert = $el.find('#si-error-notification');
        var $successNotification = $el.find('#si-success-notification');
        var $signupLink = $el.find('#signup-link');

        // Bind global events
        PubSub.subscribe('signup', function() {
            $successNotification.show();
        });

        function bindAll() {
            $form.on('submit', submitHandler);
            $signupLink.on('click', navigate);
            PubSub.subscribe('destroy', destroy);
        }

        function unbindAll() {
            $form.off('submit');
            $signupLink.off('click', navigate);
            PubSub.unsubscribe('destroy', destroy);
        }

        function navigate(e) {
            e.preventDefault();
            destroy();
            Router.navigate('/inscription');
        }

        function submitHandler(e) {
            e.preventDefault();
            $.ajax({
                url: app.API_URL + '/session',
                method: 'POST',
                data: Utils.serializeForm($form),
                async: false,
                success: function(data) {
                    app.setUser(data);
                    destroy();
                    if(app.isProfessor()) {
                        Router.navigate('/mobilites');
                    } else {
                        Router.navigate('/demandes-de-mobilite');
                    }
                },
                error: function() {
                    cleanForm();
                    $alert.show();
                    Utils.animate($el, 'wobble');
                }
            });
        }

        function render() {
            bindAll();
            $el.show();
            document.title = 'Connexion | StudentExchangeTools';
        }

        function cleanForm() {
            $form.find(':input').val('');
        }

        function destroy() {
            $el.hide();
            unbindAll();
            cleanForm()
            $alert.hide();
            $successNotification.hide();
        }

        return {
            render: render,
            destroy: destroy
        }

    })();

    var SignupView = (function() {

        // Private attributes
        var validator;

        // Cache DOM
        var $el = $('#signup-view');
        var $form = $el.find('form');
        var $optionsSelect = $el.find('#fsu-field-option');
        var $signinLink = $el.find('#signin-link');

        // Bind events
        function bindAll() {
            $form.on('submit', submitHandler);
            $signinLink.on('click', navigate);
            PubSub.subscribe('destroy', destroy)
        }

        function unbindAll() {
            $form.off('submit');
            $signinLink.off('click', navigate);
            PubSub.unsubscribe('destroy', destroy);
        }

        // Form validation
        var validation = {
            submitHandler: function(form) {
                console.log(form);
            },
            rules: {
                lastName: {
                    required: true,
                    maxlength: 35
                },
                firstName: {
                    required: true,
                    maxlength: 35
                },
                username: {
                    required: true,
                    maxlength: 20
                },
                password: {
                    required: true
                },
                reenterPassword: {
                    required: true,
                    equalTo: "#fsu-field-password"
                },
                email: {
                    required: true,
                    email: true,
                    maxlength: 255
                }
            },
            messages: {
                lastName: "Votre nom ne peut être vide.",
                firstName: "Votre prénom ne peut être vide.",
                username: "Le champs ne peut  être vide.",
                password: "Le champs ne peut être vide.",
                reenterPassword: "Les deux mots de passes ne correspondent pas.",
                email: "L'email est invalide."
            }
        };

        function navigate(e) {
            e.preventDefault();
            destroy();
            Router.navigate('/connexion');
        }

        function submitHandler(e) {
            e.preventDefault();
            if(!$form.valid()) {
                return;
            }
            var data = Utils.serializeForm($form);
            console.log(JSON.stringify(data));
            $.ajax({
                url: app.API_URL + '/users',
                method: 'POST',
                data: {data: JSON.stringify(data)},
                success: function () {
                    PubSub.publish('signup');
                    Router.navigate('/connexion');
                },
                statusCode: {
                    400: function(data) {
                        var error = data.responseJSON;
                        if(error !== undefined) {
                            for(var i = 0; i < error.details.length; i++) {
                                if(error.details[i].errorCode === 204) {
                                    $el.find('#fsu-field-username').parent()
                                        .append('<label id="fsu-field-username-error" class="error" for="fsu-field-username">Ce nom d\'utilisateur existe déjà.</label>');
                                }
                                if(error.details[i].errorCode === 207) {
                                    $el.find('#fsu-field-email').parent()
                                        .append('<label id="fsu-field-email-error" class="error" for="fsu-field-email">Cet e-mail est déjà associé à un compte.</label>');
                                }
                            }
                        } else {
                            PubSub.publish('applicationError');
                        }
                    },
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function loadOptions() {
            $.ajax({
                url: app.API_URL + '/options',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $optionsSelect.append('<option value="'+ data[i]['code'] +'">' + data[i]['name'] + '</option>');
                    }
                },
                statusCode: {
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function render() {
            bindAll();
            loadOptions();
            document.title = 'Inscription | StudentExchangeTools';
            if(validator === undefined) {
                validator = $form.validate(validation);
            }
            $el.show();
        }

        function destroy() {
            $el.hide();
            unbindAll();
            validator.resetForm();
            $form.find(':input').val('');
            $optionsSelect.empty();
        }

        return {
            render: render
        }

    })();

    var NavigationBarView = (function() {

        var isDisplayed = false;

        // Cache DOM
        var $el;
        var $aSignout;
        var $aMenu;

        function cacheDOM() {
            $el = $('header');
            $aSignout = $el.find('#signout');
            $aMenu = $el.find('ul.menu li a');
        }

        function render() {
            if(isDisplayed) {
                return;
            }
            if(!$el) {
                cacheDOM();
            }
            bindAll();
            if(app.isProfessor()) {
                $el.find('[role=professor]').show();
            } else {
                $el.find('[role=student]').show();
            }
            $el.find('a[href="' + Router.getPath() + '"]').addClass('active');
            $el.show();
            isDisplayed = true;
        }

        function bindAll() {
            $aSignout.on('click', signoutHandler);
            $aMenu.on('click', navigate);
        }

        function unbindAll() {
            $aSignout.off('click', signoutHandler);
            $aMenu.off('click', navigate);
        }

        function navigate(e) {
            e.preventDefault();
            $(this).parent().parent().find('a').removeClass('active');
            $(this).addClass('active');
            Router.navigate($(this).attr('href'));
        }

        // Event handlers
        function signoutHandler(e) {
            e.preventDefault();
            $.ajax({
                url: app.API_URL + '/session',
                method: 'DELETE',
                success: function() {
                    destroy();
                    PubSub.publish('destroy');
                    app.setUser(undefined);
                    Router.navigate('/connexion');
                }
            });
        }

        function destroy() {
            $el.hide();
            $aMenu.removeClass('active');
            isDisplayed = false;
            unbindAll();
            $el.find('[role=professor]').hide();
            $el.find('[role=student]').hide();
        }

        return {
            render: render
        }
    })();

    var MobilityChoicesView = (function() {

        // Private attributes
        var title = 'Demandes de mobilité';
        var filter;
        var table;

        // Cache DOM
        var $el = $('#mobility-choices-view');
        var $table = $el.find('table');
        var $filtersSelect = $el.find('#fsu-field-filter');
        var $createButton = $el.find('button');
        var $buttonExport = $el.find('#export-mobility-choices');

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            PubSub.subscribe('updateMobilityChoices', updateTable);
            $createButton.on('click', navigateToCreate);
            $filtersSelect.on('change', reloadTable);
            $table.on('click', 'tbody tr .confirm-mc-button', confirm);
            $table.on('click', 'tbody tr .cancel-mc-button', cancel);
            $table.on('click', 'tbody td .new-partner-button', newPartner);
            $buttonExport.on('click', exportToCsv);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            PubSub.unsubscribe('updateMobilityChoices', updateTable);
            $createButton.off('click', navigateToCreate);
            $filtersSelect.off('change', reloadTable);
            $table.off('click', 'tbody tr .confirm-mc-button', confirm);
            $table.off('click', 'tbody tr .cancel-mc-button', cancel);
            $table.off('click', 'tbody td .new-partner-button', newPartner);
            $buttonExport.off('click', exportToCsv);
        }

        function exportToCsv() {
            var filename = 'demandes_mobilites.csv'
            $(this).attr({
                'href': app.API_URL + '/mobilityChoices/export',
                'download': filename,
                'target': '_blank'
            });
        }

        function confirm(e) {
            e.preventDefault();
            var mChoiceId = $(this).parent().parent().find('.mc-id').html();
            $.ajax({
                url: app.API_URL + '/mobilityChoices/' + mChoiceId + '/confirm',
                method: 'PUT',
                success: function(resp) {
                    updateTable();
                }
            });
        }

        function newPartner(e) {
            e.preventDefault();
            var mChoiceId = $(this).parent().parent().find('.mc-id').html();
            new CreatePartnerView(mChoiceId, confirmWithPartner).render();
        }

        function confirmWithPartner(mChoiceId, partner) {
            console.log(partner);
            console.log(JSON.stringify(partner));
            $.ajax({
                url: app.API_URL + '/mobilityChoices/' + mChoiceId + '/confirmWithNewPartner',
                method: 'PUT',
                data: {data: JSON.stringify(partner)},
                success: function(resp) {}
            });
        }

        function cancel(e) {
            e.preventDefault();
            if (app.isProfessor()) {
                RejectMobilityChoiceView.render($(this).parent().parent().attr('data-id'));
            } else {
                CancelMobilityChoiceView.render($(this).parent().parent().attr('data-id'));
            }
        }

        function navigateToCreate(e) {
            e.preventDefault();
            new CreateMobilityChoiceView().render();
        }

        function reloadTable(e) {
            e.preventDefault();
            table.destroy();
            initializeTable();
        }

        function initializeTable() {
            if(app.isProfessor()) {
                table = $table.DataTable({
                    serverSide: false,
                    ajax: {
                        url: app.API_URL + '/mobilityChoices',
                        data: {
                            filter: $filtersSelect.val()
                        }
                    },
                    autoWidth: false,
                    bLengthChange: false,
                    bInfo: false,
                    oLanguage: dataTableStrings,
                    aoColumns: [
                        {
                            mData: function(o, type) {
                                return o.preferenceOrder + '<span class="mc-id" style="display: none;">' + o.id + '</span>';
                            },
                            title: '# Préférence'
                        },
                        {
                            mData: function (o, type) {
                                return o.user.lastName + ' ' + o.user.firstName;
                            },
                            title: 'Etudiant'
                        },
                        {
                            mData: function (o, type) {
                                var $cellContents = '';
                                if(o.country.countryCode !== undefined) {
                                    $cellContents = '<img src="../images/flags/'
                                        + o.country.countryCode
                                        + '.png" alt="Drapeau" class="flags">';
                                }
                                if (o.partner === undefined) {
                                    if (o.denialReason === undefined && o.cancellationReason === undefined) {
                                        $cellContents += '<a class="new-partner-button" href="" name="new-partner">Ajouter un partenaire</a>';
                                    } else {

                                        $cellContents += 'Pas de partenaire spécifié';
                                    }
                                } else {
                                    $cellContents += o.partner.fullName;
                                }
                                return $cellContents
                            },
                            title: 'Partenaire'
                        },
                        {
                            mData: function (o, type) {
                                return (o.mobilityType === 'SMS') ? 'Académique' : 'Stage';
                            },
                            title: 'Type'
                        },
                        {
                            mData: function (o, type) {
                                return o.programme.programmeName;
                            },
                            title: 'Programme'
                        },
                        {
                            mData: function (o, type) {
                                return ((o.term === 1) ? 'Septembre' : 'Février') + ' ' + o.academicYear
                            },
                            title: 'Départ'
                        },
                        {
                            mData: function (o, type) {
                                if (o.denialReason !== undefined) {
                                    return 'Refusée';
                                } else if (o.cancellationReason !== undefined) {
                                    return 'Annulée';
                                } else {
                                    if (o.partner === undefined) {
                                        return '<button class="btn btn-default new-partner-button">Confirmer</button>  <button class="btn btn-danger cancel-mc-button">Annuler</button>';
                                    } else {
                                        return '<button class="btn btn-default confirm-mc-button">Confirmer</button>  <button class="btn btn-danger cancel-mc-button">Annuler</button>';
                                    }
                                }
                            },
                            title: 'Actions'
                        }],
                    fnCreatedRow: function(nRow, aData, iDataIndex ) {
                        $(nRow).attr({'data-id' : aData.id});
                    }
                });
            } else {
                table = $table.DataTable({
                    serverSide: false,
                    ajax: {
                        url: app.API_URL + '/mobilityChoices',
                        data: {
                            filter: $filtersSelect.val()
                        }
                    },
                    autoWidth: false,
                    bLengthChange: false,
                    bInfo: false,
                    oLanguage: dataTableStrings,
                    aoColumns: [
                        {
                            mData: function(o, type) {
                                return o.preferenceOrder + '<span class="mc-id" style="display: none;">' + o.id + '</span>';
                            },
                            title: '# Préférence'
                        },
                        {
                            mData: function (o, type) {
                                var $cellContents = '';
                                if(o.country.countryCode !== undefined) {
                                    $cellContents = '<img src="../images/flags/'
                                        + o.country.countryCode
                                        + '.png" alt="Drapeau" class="flags">';
                                }
                                if (o.partner === undefined) {
                                    if (o.denialReason === undefined && o.cancellationReason === undefined) {
                                        $cellContents += '<a class="new-partner-button" href="" name="new-partner">Ajouter un partenaire</a>';
                                    } else {

                                        $cellContents += 'Pas de partenaire spécifié';
                                    }
                                } else {
                                    $cellContents += o.partner.fullName;
                                }
                                return $cellContents
                            },
                            title: 'Partenaire'
                        },
                        {
                            mData: function (o, type) {
                                return (o.mobilityType === 'SMS') ? 'Académique' : 'Stage';
                            },
                            title: 'Type'
                        },
                        {
                            mData: function (o, type) {
                                return o.programme.programmeName;
                            },
                            title: 'Programme'
                        },
                        {
                            mData: function (o, type) {
                                return ((o.term === 1) ? 'Septembre' : 'Février') + ' ' + o.academicYear
                            },
                            title: 'Départ'
                        },
                        {
                            mData: function (o, type) {
                                if (o.denialReason !== undefined) {
                                    return 'Refusée';
                                } else if (o.cancellationReason !== undefined) {
                                    return 'Annulée';
                                } else {
                                    return '<button class="btn btn-primary cancel-mc-button">Annuler</button>';
                                }
                            },
                            title: 'Actions'
                        }],
                    fnCreatedRow: function(nRow, aData, iDataIndex ) {
                        $(nRow).attr({'data-id' : aData.id});
                    }
                });
            }
        }

        function updateTable() {
            table.ajax.reload();
            PubSub.publish('destroyModalView');
        }

        function updateWindowTitle() {
            var title;
            if(app.isProfessor()) {
                title = 'Demandes de mobilité';
            } else {
                title = 'Mes demandes de mobilités';
            }
            document.title = title + ' | ' + app.getAppName();
        }

        function render() {
            NavigationBarView.render();
            if(!table) {
                initializeTable();
            } else {
                updateTable();
            }
            bindAll();
            $el.find('h2').html(((app.isProfessor()) ? 'Gestions des demandes de mobilité' : 'Mes demandes de mobilité'));
            updateWindowTitle();
            $el.show();
        }

        function destroy() {
            $el.hide();
            PubSub.publish('destroyModalView');
            unbindAll();
        }

        // Public api
        return {
            render: render,
            destroy: destroy
        }

    })();

    var CreateDenialReasonView = (function(mobilityChoiceId) {

        //Private variables
        var previousTitle = document.title;
        var mChoiceId = mobilityChoiceId;

        //Cache DOM
        var $el = $('#reject-mobility-choice-view');
        var $divClose = $el.find('div.close');
        var $form = $el.find('#create-denial-reason-form');
        var $aSwitchToSelect = $form.find('a');

        function bindAll() {
            $form.on('submit', submitHandler);
            $divClose.on('click', destroy);
            $aSwitchToSelect.on('click', switchToSelect);
            PubSub.subscribe('destroyModalView', destroy);
        }

        function unbindAll() {
            $form.off('submit', submitHandler);
            $divClose.off('click', destroy);
            $aSwitchToSelect.off('click', switchToSelect);
            PubSub.unsubscribe('destroyModalView', destroy);
        }

        function submitHandler(e) {
            e.preventDefault();
            $form.validate({debug: true});
            var data = Utils.serializeForm($form);
            $.ajax({
                url: app.API_URL + '/denialreasons/',
                method: 'POST',
                data: {
                    reason: JSON.stringify(data['denialReason'])
                },
                success: function () {
                    console.log('ok');
                    switchToSelect(e);
                },
                error: function () {
                    Utils.animate($el, 'wobble');
                }
            });
        }

        // Form validation
        var validation = {
            submitHandler: function(form) {
                console.log(form);
            },
            rules: {
                reason: {
                    required: true,
                    maxlength: 300
                }
            },
            messages: {
                reason: "Le champ ne peut pas être vide."
            }
        };

        function switchToSelect(e) {
            e.preventDefault();
            destroy();
            RejectMobilityChoiceView.render(mChoiceId);
        }

        function render(mobilityChoiceId) {
            bindAll();
            mChoiceId = mobilityChoiceId;
            $form.validate(validation);
            $form.show();
            $el.show();
        }

        function destroy() {
            mChoiceId = 0;
            $form.hide();
            $el.hide();
            unbindAll();
        }

        return {
            render: render,
            destroy: destroy
        }
    })();

    var CreateMobilityChoiceView = (function() {

        // Cache DOM
        var $el = $('#create-mobility-choice-view');
        var $buttonSubmit = $el.find('button');
        var $form = $el.find('form');
        var $programmesSelect = $form.find('#fsu-field-programme');
        var $countriesSelect = $form.find('#fsu-field-country');
        var $partnersSelect = $form.find('#fsu-field-partner');
        var $studentsSelect = $form.find('#fsu-field-user');
        var $selectDepartureDate = $form.find('#fsu-field-departure-date');
        var $elsProfessor = $el.find('[data-role=Professor]');
        var $divClose = $el.find('div .close');

        // Bind events
        function bindAll() {
            $buttonSubmit.on('click', submitHandler);
            $programmesSelect.on('change', refreshCountries);
            $countriesSelect.on('change', refreshPartners);
            $divClose.on('click', closeWindow);
            PubSub.subscribe('destroyModalView', destroy);
        }

        function unbindAll() {
            $buttonSubmit.off('click', submitHandler);
            $programmesSelect.off('change', refreshCountries);
            $countriesSelect.off('change', refreshPartners);
            $divClose.off('click', closeWindow);
            PubSub.unsubscribe('destroyModalView', destroy);
        }

        function refreshProgrammes(e) {
            e.preventDefault();
            loadProgrammes();
        }

        function refreshCountries(e) {
            e.preventDefault();
            loadCountries();
        }

        function refreshPartners(e) {
            e.preventDefault();
            loadPartners();
        }

        function closeWindow(e) {
            e.preventDefault();
            destroy();
        }

        // Form validation
        var validation = {
            rules: {
                preferenceOrder: {
                    required: true
                },
                mobilityType: {
                    required: true,
                    maxlength: 3
                }
            },
            messages: {
                preferenceOrder: "Le champ ne peut pas être vide."
            }
        };

        function submitHandler(e) {
            e.preventDefault();
            $form.validate({debug: true});
            if ($form.valid()) {
                var data = Utils.serializeForm($form);
                if (data['partner'] === undefined || data['partner']['id'] == -1) delete data['partner'];
                if (data['country'] === undefined || data['country']['countryCode'] == -1) delete data['country'];
                var departure = data['departureDate'].split(' ');
                delete data['departureDate'];
                data['term'] = departure[0];
                data['academicYear'] = departure[1];
                if(!app.isProfessor()) {
                    data.user = app.getUser();
                }
                $.ajax({
                    url: app.API_URL + '/mobilityChoice',
                    method: 'POST',
                    data: {data: JSON.stringify(data)},
                    success: function () {
                        destroy();
                        PubSub.publish('updateMobilityChoices');
                    },
                    error: function (e) {
                        Utils.animate($el, 'wobble');
                    }
                });
            } else {
                Utils.animate($el, 'wobble');
            }
        }

        function loadStudents() {
            $studentsSelect.empty();
            $.ajax({
                url: app.API_URL + '/users',
                success: function (data) {
                    for(var i = 0; i < data['data'].length; i++ ) {
                        if (data['data'][i]['role'] === 'Student') {
                            $studentsSelect.append('<option value="' + data['data'][i]['id'] + '">' + data['data'][i]['lastName'] + ' ' + data['data'][i]['firstName'] + '</option>');
                        }
                    }
                }
            });
        }

        function loadProgrammes() {
            $programmesSelect.empty();
            $.ajax({
                url: app.API_URL + '/programmes',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $programmesSelect.append('<option value="'+ data[i]['id'] +'">' + data[i]['programmeName'] + '</option>');
                    }
                    $programmesSelect.append('<option value="-1">Définir plus tard</option>');
                    loadCountries();
                }
            });
        }

        function loadCountries() {
            $countriesSelect.empty();
            $.ajax({
                url: app.API_URL + '/countries',
                success: function (data) {
                    var currentProgramme = $programmesSelect.find('option:selected').val();
                    for(var i = 0; i < data.length; i++ ) {
                        if (currentProgramme === 'Définir plus tard' || data[i]['programme']['id'] == currentProgramme) {
                            $countriesSelect.append('<option value="' + data[i]['countryCode'] + '">' + data[i]['name'] + '</option>');
                        }
                    }
                    $countriesSelect.append('<option value="-1">Définir plus tard</option>');
                    $countriesSelect[0].selectedIndex = 0;
                    $countriesSelect.selectedIndex = 0;
                    loadPartners();
                }
            });
        }

        function loadPartners() {
            $partnersSelect.empty();
            $partnersSelect.append('<option value="-1">Définir plus tard</option>');
            $.ajax({
                url: app.API_URL + '/partners',
                data: {
                    filter: 'country',
                    value: $countriesSelect.val()
                },
                success: function (data) {
                    for(var i = 0; i < data['data'].length; i++ ) {
                        console.log(data['data'].length);
                        $partnersSelect.append('<option value="'+ data['data'][i]['id'] +'">' + data['data'][i]['businessName'] + '</option>');
                    }
                }
            });
        }

        function loadDepartureDates() {
            $selectDepartureDate.empty();
            var d = new Date();
            var currentYear = d.getFullYear();
            for (var i = 0; i < 3; i++) { //load 3 years
                $selectDepartureDate.append('<option value="' + 2 + ' ' + (currentYear + i) + '">' + Utils.departureStr(2, currentYear+i) + '</option>');
                $selectDepartureDate.append('<option value="' + 1 + ' ' + (currentYear + i) + '">' + Utils.departureStr(1, currentYear+i) + '</option>');
            }
        }

        function render() {
            bindAll();
            if(app.isProfessor()) {
                loadStudents();
                $elsProfessor.show();
            }
            loadProgrammes();
            loadDepartureDates();
            $form.validate(validation);
            $el.show();
        }

        function destroy() {
            $el.hide();
            $elsProfessor.hide();
            unbindAll();
            $form.find(':input').val('');
        }

        return {
            render: render
        }

    });

    var CancelMobilityChoiceView = (function() {

        // Private attributes
        var previousTitle = document.title;
        var mChoiceId;// = mobilityChoiceId;

        // Cache DOM
        var $el = $('#cancel-mobility-choice-view');
        var $form = $el.find('form');
        var $divClose = $el.find('div.close');

        // Bind events
        function bindAll() {
            $form.on('submit', submitHandler);
            $divClose.on('click', closeWindow);
            PubSub.subscribe('destroyModalView', destroy);
        }

        function navigate(e) {
            e.preventDefault();
            destroy();
            Router.navigate('/connexion');
        }

        function closeWindow(e) {
            e.preventDefault();
            destroy();
        }

        // Form validation
        var validation = {
            submitHandler: function(form) {
                console.log(form);
            },
            rules: {
                cancellationReason: {
                    required: true
                }
            },
            messages: {
                cancellationReason: "Le champ ne peut pas être vide."
            }
        };

        function submitHandler(e) {
            e.preventDefault();
            $form.validate();
            var data = JSON.stringify($form.find('textarea').val());

            $.ajax({
                url: app.API_URL + '/mobilityChoices/' + mChoiceId +  '/cancel',
                method: 'PUT',
                data: {
                    "reason": data
                },
                success: function () {
                    destroy();
                    PubSub.publish('updateMobilityChoices');
                },
                error: function (e) {
                    Utils.animate($el, 'wobble');
                    if (e.status == 500) {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function render(mobilityChoiceId) {
            bindAll();
            mChoiceId = mobilityChoiceId;
            document.title = 'Annulation de demande de mobilité | StudentExchangeTools';
            $form.validate(validation);
            $el.show();
        }

        function unbindAll() {
            $form.off('submit');
            $divClose.off('click', closeWindow);
            PubSub.unsubscribe('destroyModalView', destroy);
        }

        function destroy() {
            $el.hide();
            unbindAll();
            mChoiceId = 0;
            document.title = previousTitle;
        }

        return {
            render: render,
            destroy: destroy
        }
    })();

    var RejectMobilityChoiceView = (function() {

        // Private variables
        var previousTitle = document.title;
        var mChoiceId;// = mobilityChoiceId

        // Cache DOM
        var $el = $('#reject-mobility-choice-view');
        var $form = $el.find('#select-denial-reason-form');
        var $selectReason = $el.find('#fsu-field-denial-reason');
        var $divClose = $el.find('div.close');
        var $aSwitchToCreate = $form.find('a');

        // Bind events
        function bindAll() {
            $form.on('submit', submitHandler);
            $divClose.on('click', closeWindow);
            $aSwitchToCreate.on('click', switchToCreate);
            PubSub.subscribe('destroyModalView', destroy);
        }

        function switchToCreate(e) {
            e.preventDefault();
            $form.hide();
            destroy();
            CreateDenialReasonView.render(mChoiceId);
        }

        function closeWindow(e) {
            e.preventDefault();
            destroy();
        }

        function submitHandler(e) {
            e.preventDefault();
            var data = Utils.serializeForm($form);
            console.log(data);
            $.ajax({
                url: app.API_URL + '/mobilityChoices/' + mChoiceId +  '/reject',
                method: 'PUT',
                data: {
                    "reason": data['denialReason']['id']
                },
                success: function () {
                    console.log('ok');
                    PubSub.publish('updateMobilityChoices');
                },
                error: function () {
                    Utils.animate($el, 'wobble');
                }
            });
        }

        function loadDenialReasons() {
            $.ajax({
                url: app.API_URL + '/denialReasons',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $selectReason.append('<option value="'+ data[i]['id'] +'">' + data[i]['reason'] + '</option>');
                    }
                },
                statusCode: {
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function render(mobilityChoiceId) {
            mChoiceId = mobilityChoiceId;
            bindAll();
            loadDenialReasons();
            document.title = 'Refus de demande de mobilité | StudentExchangeTools';
            $form.show();
            $el.show();
        }

        function unbindAll() {
            $form.off('submit');
            $divClose.off('click', closeWindow);
            $aSwitchToCreate.off('click', switchToCreate);
            PubSub.unsubscribe('destroyModalView', destroy);
        }

        function destroy() {
            $form.hide();
            $el.hide();
            unbindAll();
            $selectReason.empty();
            mChoiceId = 0;
            document.title = previousTitle;
        }

        return {
            render: render,
            destroy: destroy
        }
    })();

    var CreatePartnerView = (function(mChoiceId, callback) {

        //private attributes
        var previousTitle = document.title;
        var mobilityChoiceId = mChoiceId; //the id is not used, but it is given as an argument to the callback if they are both defined
        var myCallback = callback;
        var partnerOptions = [];
        var restoringArchive = false;
        var archivedMatches;
        var partnerToRestore;

        // Cache DOM
        var $el = $('#create-partner-view');
        var $form = $el.find('form');
        var $listArchivedMatches = $el.find('#archived-matches');
        var $optionsSelect = $form.find('#fsu-field-option');
        var $addOptionButton = $form.find('#fsu-field-add-partner-option');
        var $countriesSelect = $form.find('#fsu-field-country');
        var $organisationTypesSelect = $form.find('#fsu-field-organisation-type');
        var $fullNameInput = $form.find('#fsu-field-full-name');
        var $partnerOptionsDiv = $form.find('#div-partner-options');
        var $divClose = $el.find('div .close');

        // Bind events
        function bindAll() {
            $form.on('submit', submitHandler);
            $listArchivedMatches.on('click', 'button', selectMatch)
            $partnerOptionsDiv.on('click', 'button', removeOption);
            $addOptionButton.on('click', addOption);
            $fullNameInput.on('input', scanArchives);
            $divClose.on('click', closeWindow);
            PubSub.subscribe('destroyModalView', destroy);
        }

        function unbindAll() {
            $form.off('submit', submitHandler);
            $listArchivedMatches.off('click', 'button', selectMatch);
            $partnerOptionsDiv.off('click', 'button', removeOption);
            $addOptionButton.off('click', addOption);
            $fullNameInput.off('input', scanArchives);
            $divClose.off('click', closeWindow);
            PubSub.unsubscribe('destroyModalView', destroy);
        }

        function selectMatch(e) {
            e.preventDefault();
            restoringArchive = true;
            partnerToRestore = archivedMatches[$(this).parent().attr('data-id')];
            $optionsSelect.empty();
            loadOptions();
            $form.find('#fsu-field-partner-option').val('');
            $listArchivedMatches.hide();
            submitHandler(e);
        }

        function scanArchives(e) {
            e.preventDefault();
            $.ajax({
                url: app.API_URL + '/partners',
                data: {
                    filter: 'archived',
                    value: $fullNameInput.val() !== '' ? $fullNameInput.val() : '\n '
                },
                success: function (response) {
                    $listArchivedMatches.html('');
                    archivedMatches = response['data'];
                    if (archivedMatches.length > 0) {
                        $listArchivedMatches.show();
                        for (var i = 0; i < archivedMatches.length; i++) {
                                $listArchivedMatches.append('<li data-id="' + i + '" >' + archivedMatches[i]['fullName'] + '<button type="button" class="btn btn-default">Confirmer</button></li>');
                        }
                    } else {
                        console.log('ok');
                        restoringArchive = false;
                        $listArchivedMatches.hide();
                    }
                },
                error: function (error) {
                    if (e.status == 500) {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function addOption(e) {
            e.preventDefault();
            var department = $form.find('#fsu-field-partner-option');
            for (var i = 0; i < partnerOptions.length; i++) {
                if (partnerOptions[i]['code'] === $optionsSelect.val()) {
                    Utils.animate($partnerOptionsDiv.find('div:nth-child(' + (i+1) + ')'), 'wobble');
                    department.val('');
                    return;
                }
            }
            partnerOptions[partnerOptions.length] = {
                code: $optionsSelect.val(),
                department: department.val()
            };
            $partnerOptionsDiv.append('<div style="display: inline-block; text-size: 8px; margin: 0.7%">'
                +             '<span>' + $optionsSelect.val() + ' - ' + department.val() + '</span><button type="button" value="' + (partnerOptions.length-1) + '" class="btn-default" style="margin: 1px">x</button></div>');
            department.val('');
        }

        function removeOption(e) {
            e.preventDefault();
            var index = + $(this).val();
            $partnerOptionsDiv.find('div:nth-child(' + (index+1) + ')').remove();
            for (var i = index; i < partnerOptions.length-1; i++) {
                partnerOptions[i] = partnerOptions[i+1];
                $partnerOptionsDiv.find('div:nth-child(' + (i+1) + ') button').val(i);
            }
            partnerOptions.length--;
        }

        function closeWindow(e) {
            e.preventDefault();
            destroy();
        }
        // Form validation
        var validation = {
            submitHandler: function(form) {
                console.log(form);
            },
            rules: {
                legalName: {
                    required: true,
                    maxlength: 255
                },
                businessName: {
                    required: true,
                    maxlength: 255
                },
                fullName: {
                    required: true,
                    maxlength: 255
                },
                department: {
                    required: true,
                    maxlength: 255
                },
                employeeCount: {
                    required: true
                },
                street: {
                    required: true,
                    maxlength: 80
                },
                number: {
                    required: true
                },
                postalCode: {
                    required: true,
                    maxlength: 10
                },
                city: {
                    required: true,
                    maxlength: 60
                },
                region: {
                    maxlength: 60
                },
                email: {
                    required: true,
                    email: true,
                    maxlength: 255
                },
                website: {
                    maxlength: 255
                },
                phoneNumber: {
                    required: true,
                    maxlength: 15
                }
            },
            messages: {
                legalName: "Le nom légal ne peut pas être vide.",
                businessName: "Le nom d'affaires ne peut pas être vide.",
                fullName: "Le nom complet ne peut pas être vide.",
                department: "Le champ ne peut pas être vide.",
                employeeCount: "Le champ ne peut pas être vide.",
                street: "Le champ ne peut pas être vide.",
                number: "Le champ ne peut pas être vide.",
                postalCode: "Le champ ne peut pas être vide.",
                city: "Le champ ne peut pas être vide.",
                email: "L'email est invalide.",
                phoneNumber: "Le numéro de téléphone ne peut pas être vide."
            }
        };

        function navigate(e) {
            e.preventDefault();
            destroy();
            Router.navigate('/demandes-de-mobilite');
        }

        function submitHandler(e) {
            e.preventDefault();
            var method = 'POST';
            var url = app.API_URL + '/partners';
            var data;
            if (restoringArchive) {
                method = 'PUT';
                url = url + '/' + partnerToRestore['id'] + '/restore';
                if (myCallback !== undefined && mobilityChoiceId !== undefined) {
                    data = partnerToRestore;
                } else {
                    data = {};
                }
            } else {
                $form.validate({debug: true});
                data = Utils.serializeForm($form);
            }
            console.log('url : ' + url);
            data['options'] = partnerOptions;
            if (data['official'] == 'on') {
                data['official'] = true;
            } else {
                data['official'] = false;
            }
            console.log(data);
            console.log(JSON.stringify(data));
            if (myCallback !== undefined && mobilityChoiceId !== undefined) {
                myCallback(mobilityChoiceId, data);
                destroy();
                PubSub.publish('updateMobilityChoices');
            } else {
                $.ajax({
                    url: url,
                    method: method,
                    data: {data: JSON.stringify(data)},
                    success: function (response) {
                        console.log('ok');
                        destroy();
                    },
                    error: function (error) {
                        if (error.status == 500) {
                            PubSub.publish('serverError');
                        }
                    }
                });
            }
        }

        function loadOptions() {
            $.ajax({
                url: app.API_URL + '/options',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $optionsSelect.append('<option value="'+ data[i]['code'] +'">' + data[i]['name'] + '</option>');
                    }
                },
                statusCode: {
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function loadCountries() {
            $.ajax({
                url: app.API_URL + '/countries',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $countriesSelect.append('<option value="'+ data[i]['countryCode'] +'">' + data[i]['name'] + '</option>');
                    }
                },
                statusCode: {
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function loadOrganisationTypes() {
            $organisationTypesSelect.append('<option value="TPE">TPE</option>');
            $organisationTypesSelect.append('<option value="PME">PME</option>');
            $organisationTypesSelect.append('<option value="ETI">ETI</option>');
            $organisationTypesSelect.append('<option value="TGE">TGE</option>');
        }

        function render() {
            bindAll();
            loadOptions();
            loadCountries();
            loadOrganisationTypes();
            document.title = 'Ajout de partenaire | StudentExchangeTools';
            $form.validate(validation);
            $el.show();
            if (app.isProfessor()) {
                $el.find('#div-official').show();
            }
        }

        function destroy() {
            $el.find('#div-official').hide();
            $el.hide();
            unbindAll();
            $optionsSelect.empty();
            $countriesSelect.empty();
            $organisationTypesSelect.empty();
            while (partnerOptions.length) {
                partnerOptions.pop();
            }
            mobilityChoiceId = undefined;
            myCallback = undefined;
            document.title = previousTitle;
        }

        return {
            render: render
        }

    });

    var MobilitiesView = (function () {

        // Private attributes
        var table;

        // DOM cache
        var $el;
        var $table;

        function cacheDOM() {
            $el = $('#mobilities-view');
            $table = $el.find('table');
        }

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            PubSub.subscribe('updateMobility', updateTable);
            $table.on('click', 'tbody tr', showMobility);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            PubSub.unsubscribe('updateMobility', updateTable);
            $table.off('click', 'tbody tr', showMobility);
        }

        function initializeTable() {
            table = $table.DataTable({
                serverSide: false,
                ajax: app.API_URL + '/mobilities',
                autoWidth: false,
                dataSrc: '',
                order: [[ 5, 'desc' ]],
                bLengthChange: false,
                bInfo: false,
                oLanguage: dataTableStrings,
                aoColumns: [
                    {
                        mData: function(o, type) {
                            return o.nominatedStudent.option.code;
                        },
                        title: ''
                    },
                    {
                        mData: function (o, type) {
                            return o.nominatedStudent.firstName + ' ' + o.nominatedStudent.lastName;
                        },
                        title: 'Etudiant'
                    },
                    {
                        mData: function (o, type) {
                            return o.partner.fullName;
                        },
                        mRender: function (partner, type, raw) {
                            return '<img src="../images/flags/'+ raw.country.countryCode +'.png" class="flags" alt="" >' + partner;
                        },
                        title: 'Partenaire'
                    },
                    {
                        mData: function (o, type) {
                            return (o.mobilityType === 'SMS') ? 'Académique' : 'Stage';
                        },
                        title: 'Type'
                    },
                    {
                        mData: function (o, type) {
                            return o.programme.programmeName;
                        },
                        title: 'Programme'
                    },
                    {
                        mData: function (o, type) {
                            return ((o.term === 1) ? 'Septembre' : 'Février') + ' ' + o.academicYear;
                        },
                        title: 'Départ'
                    },
                    {
                        mData: function (o, type) {
                            return o.state;
                        },
                        mRender: function(state, type, raw) {
                            return '<span class="' + Utils.handleStateClass(state) + '">' + state + '</span>';
                        },
                        title: 'Etat'
                    }],
                fnCreatedRow: function(nRow, aData, iDataIndex ) {
                    $(nRow).attr({'data-id' : aData.id});
                }
            });
        }

        function updateTable() {
            table.ajax.reload();
        }

        function updateWindowTitle() {
            var title;
            if(app.isProfessor()) {
                title = 'Mobilités';
            } else {
                title = 'Mes mobilités';
            }
            document.title = title + ' | ' + app.getAppName();
        }

        function render() {
            if(!$el) {
                cacheDOM();
            }
            bindAll();
            $el.find('h2').html(((app.isProfessor()) ? 'Gestions des mobilités' : 'Mes mobilités'));
            NavigationBarView.render();
            if(!table) {
                initializeTable();
            } else {
                updateTable();
            }
            updateWindowTitle();
            $el.show();
        }

        function showMobility(e) {
            e.preventDefault();
            var id = $(this).attr('data-id');
            MobilityView.show(id);
        }

        function destroy() {
            $el.hide();
            unbindAll();
        }

        // Public api
        return {
            render: render,
            destroy: destroy
        }

    })();

    var MobilityView = (function () {

        // private variables
        var mobility;
        var isDisplayed;

        // DOM cache
        var $el;
        var $spanEditorHeading;
        var $aClose;
        var $divNavBar;

        function cacheDOM() {
            $el = $('#editor-view');
            $aClose = $el.find('a.close-editor');
            $spanEditorHeading = $el.find('.editor-heading');
            $divNavBar = $el.find('.nav-bar');
        }

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            $aClose.on('click', destroy);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy)
            $aClose.off('click', destroy);
        }

        function show(mobilityId) {
            fetch(mobilityId);
        }

        function render() {
            if(isDisplayed) {
                return;
            }
            isDisplayed = true;
            if($el === undefined) {
                cacheDOM();
            }
            bindAll();
            //$divNavBar.show();
            $spanEditorHeading
                .html(mobility.nominatedStudent.firstName + ' '
                    + mobility.nominatedStudent.lastName
                    + ' à <img src="/images/flags/'
                    + mobility.country.countryCode +'.png" class="flags" alt="'
                    + mobility.country.name + '">'
                    + mobility.partner.fullName);
            MobilityDetailsView.render(mobility);
            $el.show(function() {
                $el.removeClass('closed').addClass('open');
            });
        }

        function destroy(e) {
            if(e) {
                e.preventDefault();
            }
            $el.removeClass('open').addClass('closed');
            // Waits for the sliding transition to be finished to hide the view
            $el.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
                function(e) {
                    $el.hide();
                    unbindAll();
                    $spanEditorHeading.html('');
                    $divNavBar.hide();
                    MobilityDetailsView.destroy();
                    $el.off('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend');
                });
            isDisplayed = false;
        }

        function fetch(mobilityId) {
            $.ajax({
                method: 'GET',
                url: app.API_URL + '/mobilities/' + mobilityId,
                success: function(resp) {
                    mobility = resp;
                    render();
                }
            });
        }

        // Public API
        return {
            show: show
        }

    })();

    var MobilityDetailsView = (function () {

        // Constants
        var STATE_CREATED = 'Créée';
        var STATE_IN_PREPARATION = 'En préparation';
        var STATE_TO_BE_PAID = 'A payer';
        var STATE_IN_PROGRESS = 'En cours';
        var STATE_BALANCE_TO_BE_PAID = 'Solde à payer';
        var STATE_CLOSED = 'Terminée';
        var STATE_CANCELLED = 'Annulée';

        // Private attributes
        var isDisplayed = false;
        var mobility;

        // Cache DOM
        var $el = $('#mobility-details');
        var $aClose = $el.find('a.close-editor');
        var $ulDepartureDocuments = $el.find('#departure-documents');
        var $ulReturnDocuments = $el.find('#return-documents');
        var $ulSoftwareEncodings = $el.find('#software-encodings-list');
        var $elPayments = $el.find('#mobility-payments');
        var $elCancellation = $el.find('#mobility-cancellation');

        function bindAll() {
            $aClose.on('click', destroy);
            $ulDepartureDocuments.on('change', 'li input[type=checkbox]', confirmDocument);
            $ulReturnDocuments.on('change', 'li input[type=checkbox]', confirmDocument);
            $ulSoftwareEncodings.on('change', 'li input[type=checkbox]', confirmSoftwareEncoding);
            $elPayments.on('click', 'button', confirmPayment);
            $el.find('a.export-mobility').on('click', exportCsv);
            $elPayments.on('click', 'button', confirmPayment);
        }

        function unbindAll() {
            $aClose.off('click', destroy);
            $ulDepartureDocuments.off('change', 'li input[type=checkbox]', confirmDocument);
            $ulReturnDocuments.off('change', 'li input[type=checkbox]', confirmDocument);
            $ulSoftwareEncodings.off('change', 'li input[type=checkbox]', confirmSoftwareEncoding);
        }

        function render(mobilityObj) {
            if(isDisplayed) {
                return;
            }
            isDisplayed = true;
            bindAll();
            mobility = mobilityObj;
            updateView();
            $el.show();
        }

        function updateView() {
            // Updates mobility global infos in view
            $el.find('[data-src=type]').html((mobility.type === 'SMS') ? 'Académique' : 'Stage');
            $el.find('[data-src=student]')
                .html(mobility.nominatedStudent.firstName + ' ' + mobility.nominatedStudent.lastName);
            $el.find('[data-src=partner]').html(mobility.partner.fullName);
            $el.find('[data-src=country]')
                .html('<img src="../images/flags/'+ mobility.country.countryCode +'.png" class="flags" alt="Drapeau">'
                    + mobility.country.name);
            $el.find('[data-src=programme]').html(mobility.programme.programmeName);
            $el.find('[data-src=departure]').html(Utils.departureStr(mobility.term, mobility.academicYear));
            updateMobilityState();
            if(mobility.stateBeforeCancellation) {
                $el.find('[data-src=stateBeforeCancellation]').parent().show();
                $el.find('[data-src=stateBeforeCancellation]').html(mobility.stateBeforeCancellation);
            }
            if(mobility.professorInCharge.id) {
                $el.find('[data-src=professorInCharge]').parent().show();
                $el.find('[data-src=professorInCharge]')
                    .html(mobility.professorInCharge.firstName + ' ' + mobility.professorInCharge.lastName);
            }
            // Update documents in view
            var documents = mobility.documents;
            for(var i = 0; i < documents.length; i++) {
                var document = documents[i];
                var documentEl =
                    '<li><input id="document_' + document.id + '" type="checkbox" value="'
                    + document.id + '" ' + ((document.filledIn) ? 'checked disabled' : '')
                    + '><label for="document_' + document.id + '">' + document.name +'</label></li>';
                if(documents[i].category == 'D') {
                    $ulDepartureDocuments.append(documentEl);
                } else {
                    $ulReturnDocuments.append(documentEl);
                }
            }
            // Update software encoding in view
            $ulSoftwareEncodings
                .append('<li><input id="proeco-software-encoding" type="checkbox" value="proEco" '
                    + ((mobility.encodedInProEco) ? 'checked disable' : '')
                    +'> <label for="proeco-software-encoding">Pro Eco</label></li>');
            $ulSoftwareEncodings
                .append('<li><input id="second-software-encoding" type="checkbox" value="secondSoftware"'
                    + ((mobility.encodedInSecondSoftware) ? 'checked disable' : '')
                    + '><label for="second-software-encoding">'
                    + mobility.programme.externalSoftName + '</label></li>');
            // Update payments in view
            updatePayment();
            // Update cancel in view
            updateCancelView();
        }

        function updateCancelView() {
            if(mobility.state === STATE_CLOSED) {
                // Mobility cannot be cancelled
                $elCancellation.hide();
            } else if(mobility.state === STATE_CANCELLED) {
                // Mobility is cancelled
                if(mobility.cancellationReason !== undefined) {
                    $elCancellation.find('mobility-cancel-reason').html('<p class="label col-md-12">Raison de l\'annulation:<br> '
                        + mobility.cancellationReason + '</p>');
                } else {
                    $elCancellation.find('mobility-cancel-reason').html('<p class="label col-md-12">Raison de l\'annulation:<br> '
                        + mobility.denialReason.reason + '</p>');
                }
            } else {
                // Mobility can be cancelled
                if(app.isProfessor()) {
                    $elCancellation
                        .find('#mobility-cancel-action').show();
                } else {
                    $elCancellation
                        .find('#mobility-reject-action').show();
                }
            }
        }

        function cancel(e) {
            e.preventDefault();
        }

        function reject() {

        }

        function updatePayment() {
            if(!checkBankDetails()) {
                $elPayments.find('.notification').show();
            } else {
                if(mobility.firstPaymentRequestDate !== undefined) {
                    var firstPaymentRequestDate = new Date(mobility.firstPaymentRequestDate);
                    $elPayments.find('#first-payment-status .content').html('Effectué le '
                        + firstPaymentRequestDate.getUTCDate() + '/'
                        + firstPaymentRequestDate.getUTCMonth() + '/'
                        + firstPaymentRequestDate.getUTCFullYear() );
                    if(mobility.secondPaymentRequestDate !== undefined) {
                        var secondPaymentRequestDate = new Date(mobility.secondPaymentRequestDate);
                        $elPayments.find('#second-payment-status .content').html('Effectué le '
                            + secondPaymentRequestDate.getUTCDate() + '/'
                            + secondPaymentRequestDate.getUTCMonth() + '/'
                            + secondPaymentRequestDate.getUTCFullYear() );
                        $elPayments.find('#second-payment-status').show();
                    } else if (mobility.state === STATE_BALANCE_TO_BE_PAID && app.isProfessor()){
                        $elPayments.find('#second-payment-status .content').html('' +
                            '<button class="btn btn-primary">Confirmer le deuxième paiement</button>');
                        $elPayments.find('#second-payment-status').show();
                    }
                } else if(app.isProfessor()) {
                    $elPayments.find('#first-payment-status .content').html('' +
                        '<button class="btn btn-primary">Confirmer le premier paiement</button>');
                    $elPayments.find('#first-payment-status').show();
                }
                $elPayments.find('#first-payment-status').show();
            }
        }

        function updateMobilityState() {
            $el.find('[data-src=mobilityState]').html('<span class="' + Utils.handleStateClass(mobility.state) + '">'
                + mobility.state + '</span>');
        }

        function exportCsv() {
            var filename = 'mobilite_' + mobility.nominatedStudent.firstName
                + '_' + mobility.nominatedStudent.lastName + '.csv'
            $(this).attr({
                'href': app.API_URL + '/mobilities/' + mobility.id
                + '/export',
                'download': filename,
                'target': '_blank'
            });
        }

        function confirmDocument(e) {
            if(this.checked) {
                var documentId = $(this).val();
                var $checkBox = $(this);
                $checkBox.attr('disabled', true);
                $.ajax({
                    url: app.API_URL + '/mobilities/' + mobility.id
                        + '/confirmDocument?document=' + documentId + "&version=" + mobility.version,
                    method: 'PUT',
                    success: function(resp) {
                        mobility.version = resp.version;
                        mobility.state = resp.state;
                        PubSub.publish('updateMobility');
                        updateMobilityState();
                        updatePayment();
                    },
                    error: function () {
                        $checkBox.attr('checked', false);
                        $checkBox.attr('disabled', false);
                    }
                });
            }
        }

        function confirmSoftwareEncoding(e) {
            if(this.checked) {
                var url = app.API_URL + '/mobilities/' + mobility.id;
                if($(this).val() === 'proEco') {
                    url += '/confirmProEcoEncoding';
                } else {
                    url += '/confirmSecondSoftwareEncoding';
                }
                url += "?version=" + mobility.version;
                var $checkBox = $(this);
                $checkBox.attr('disabled', true);
                $.ajax({
                    url: url,
                    method: 'PUT',
                    success: function () {
                        mobility.version = mobility.version + 1;
                        PubSub.publish('updateMobility');
                    },
                    error: function () {
                        $checkBox.attr('checked', false);
                        $checkBox.attr('disabled', false);
                    }
                });
            }
        }

        function confirmPayment(e) {
            e.preventDefault();
            $.ajax({
                url: app.API_URL + '/mobilities/' + mobility.id + '/confirmPayment?version=' + mobility.version,
                method: 'PUT',
                success: function (data) {
                    mobility.firstPaymentRequestDate = data.firstPaymentRequestDate;
                    mobility.secondPaymentRequestDate = data.secondPaymentRequestDate;
                    mobility.version = data.version;
                    mobility.state = data.state;
                    updatePayment();
                    updateMobilityState();
                    PubSub.publish('updateMobility');
                }, statusCode: {
                    500: function () {
                        PubSub.publish('serverError');
                    }
                }
            });
        }

        function checkBankDetails() {
            return mobility.nominatedStudent.iban !== undefined &&
                mobility.nominatedStudent.bic !== undefined;
        }

        function destroy(e) {
            if(e !== undefined) {
                e.preventDefault();
            }
            $el.hide();
            unbindAll();
            $ulDepartureDocuments.empty();
            $ulReturnDocuments.empty();
            $ulSoftwareEncodings.empty();
            $elPayments.find('.notification').hide();
            isDisplayed = false;
        }

        return {
            destroy: destroy,
            render: render
        }

    }) ();

    var PartnersView = (function() {

        var title = 'Partenaires';
        var table;

        // Cache DOM
        var $el = $('#partners-view');
        var $table = $el.find('table');
        var $linkCreate = $el.find('#create-mobility');
        var $elsProfessor = $el.find('[data-role=Professor]');

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            PubSub.subscribe('updatePartners', updateTable);
            $table.on('click', 'tbody tr', showPartner);
            $linkCreate.on('click', createPartner);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            PubSub.unsubscribe('updatePartners', updateTable);
            $table.off('click', 'tbody tr', showPartner);
            $linkCreate.off('click', createPartner);
        }

        function initializeTable() {
            table = $table.DataTable({
                serverSide: false,
                ajax: app.API_URL + '/partners',
                dataSrc: 'data',
                autoWidth: false,
                bLengthChange: false,
                bInfo: false,
                oLanguage: dataTableStrings,
                aoColumns: [
                    {
                        mData: function(o, type) {
                            return o.fullName;
                        },
                        title: 'Nom du partenaire'
                    },
                    {
                        mData: function (obj, type) {
                            return obj.address.country;
                        },
                        mRender: function (country, type, raw) {
                            return '<img src="/images/flags/'+ country.countryCode +'.png" class="flags" alt="'
                                + country.name + '"> ' + country.name;
                        },
                        title: 'Pays'
                    },
                    {
                        mData: function (o, type) {
                            return o.organisationType;
                        },
                        title: 'Type d\'organisation'
                    },
                    {
                        mData: function (o, type) {
                            return o.programme.programmeName;
                        },
                        title: 'Programme'
                    }],
                fnCreatedRow: function(nRow, aData, iDataIndex ) {
                    $(nRow).attr({'data-id' : aData.id});
                }
            });
        }

        function updateTable() {
            table.ajax.reload();
        }

        function createPartner(e) {
            e.preventDefault();
            alert('create partner');
        }

        function showPartner() {
            var id = $(this).attr('data-id');
            PartnerView.show(id);
        }

        function render() {
            bindAll();
            document.title = title + ' | ' + app.getAppName();
            NavigationBarView.render();
            if(!table) {
                initializeTable();
            } else {
                updateTable();
            }
            if(app.isProfessor()) {
                $elsProfessor.show();
            }
            $el.find('h2').html(((app.isProfessor()) ? 'Gestions des partenaires' : 'Les partenaires'));
            $el.show();
        }

        function destroy() {
            $el.hide();
            $elsProfessor.hide();
            unbindAll();
        }

        // Public API
        return {
            render: render,
            destroy: destroy
        }

    })();

    var PartnerView = (function () {

        // private variables
        var isDisplayed;
        var partner;

        // DOM cache
        var $el;
        var $spanEditorHeading;
        var $aClose;

        function cacheDOM() {
            $el = $('#editor-view');
            $aClose = $el.find('a.close-editor');
            $spanEditorHeading = $el.find('.editor-heading');
        }

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            $aClose.on('click', destroy);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy)
            $aClose.off('click', destroy);
        }

        function show(partnerId) {
            fetch(partnerId);
        }

        function render() {
            if(isDisplayed) {
                return;
            }
            isDisplayed = true;
            if($el === undefined) {
                cacheDOM();
            }
            bindAll();
            $spanEditorHeading
                .html('<img src="/images/flags/'
                    + partner.address.country.countryCode +'.png" class="flags" alt="'
                + partner.address.country.name + '">' + partner.fullName + ', '
                    + partner.address.country.name);
            PartnerDetailsView.render(partner);
            $el.show(function() {
                $el.removeClass('closed').addClass('open');
            });
        }

        function destroy(e) {
            if(e !== undefined) {
                e.preventDefault();
            }
            $el.removeClass('open').addClass('closed');
            // Waits for the sliding transition to be finished to hide the view
            $el.on('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend',
                function(e) {
                    $el.hide();
                    unbindAll();
                    $spanEditorHeading.html('');
                    PartnerDetailsView.destroy();
                    $el.off('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend');
                });
            isDisplayed = false;
        }

        function fetch(partnerId) {
            $.ajax({
                method: 'GET',
                url: app.API_URL + '/partners/' + partnerId,
                success: function(resp) {
                    partner = resp;
                    render();
                },
                500: function () {
                    PubSub.publish('serverError');
                }
            });
        }

        // Public API
        return {
            show: show
        }

    })();

    var PartnerDetailsView = (function() {

        // Private variables
        var partner;
        var editForm;

        // DOM Cache
        var $el;
        var $elsProfessor;
        var $elDetails;
        var $aEditDetails;
        var $aEditAddress;
        var $aEditContactDetails;
        var $buttonArchivePartner;
        var $closeButton;

        function cacheDOM() {
            $el = $("#partner-view");
            $elsProfessor = $el.find('[data-role=Professor]');
            $elDetails = $el.find('#partner-details');
            $aEditDetails = $el.find('#partner-address-details a.edit');
            $buttonArchivePartner = $el.find('#archive-partner');
            $closeButton = $('#editor-view a.close-editor');
        }

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            $elDetails.find('a.edit').on('click', editDetails);
            $buttonArchivePartner.on('click', toggleArchivatePartner);
            $closeButton.on('click', destroy);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            $elDetails.find('a.edit').off('click', editDetails);
            $buttonArchivePartner.off('click', toggleArchivatePartner);
            $closeButton.off('click', destroy);
        }

        function render(partnerObj) {
            partner = partnerObj;
            if($el === undefined) {
                cacheDOM();
            }
            if(app.isProfessor()) {
                $elsProfessor.show();
                if(! partner.archivable){
                    $('#partner-actions').hide();
                }
            }
            updateView();
            bindAll();
            $el.show();
        }

        function editDetails(e) {
            e.preventDefault();
            var validation = {
                rules: {
                    legalName: {
                        required: true,
                        maxlength: 255
                    },
                    businessName: {
                        required: true,
                        maxlength: 255
                    },
                    fullName: {
                        required: true,
                        maxlength: 255
                    },
                    organisationType: {
                        required: true,
                        maxlength: 60
                    },
                    employeeCount: {
                        required: true,
                        digits: true
                    }
                },
                messages: {
                    legalName: "Le nom légal ne peut être vide et ne doit pas excéder 255 caractères.",
                    businessName: "Le nom d'affaires ne peut être vide et ne doit pas excéder 255 caractères.",
                    fullName: "Le nom complet ne peut être vide et ne doit pas excéder 255 caractères.",
                    organisationType: "Le type d'organisation ne peut-être vide et ne doit pas excéder 60 caractères.",
                    employeeCount: "Le nombre d'employé est incorrect."
                }
            };
            $elDetails.find('a.edit').hide();
            var content = $elDetails.find('.section-content').html();
            $elDetails.find('.section-content').replaceWith('<form class="section-content">' + content + '</form>');
            $el.find('[data-src=legalName]')
                .html('<input type="text" class="input" name="legalName" value="' + partner.legalName + '">');
            $el.find('[data-src=businessName]')
                .html('<input type="text" class="input" name="businessName" value="' + partner.businessName + '">');
            $el.find('[data-src=fullName]')
                .html('<input type="text" class="input" name="fullName" value="' + partner.fullName + '">');
            $el.find('[data-src=organisationType]')
                .html('<input type="text" class="input" name="organisationType" value="'
                    + partner.organisationType + '">');
            $el.find('[data-src=employeeCount]')
                .html('<input type="text" class="input" name="employeeCount" value="'
                    + partner.employeeCount + '">');
            $elDetails.find('.section-content').append('<button class="save btn btn-default">Sauvegarder</button>');
            $elDetails.find('.section-content').validate(validation);
            $elDetails.find('.section-content').on('submit', saveChanges);
        }

        function saveChanges(e) {
            e.preventDefault();
            if($elDetails.find('.section-content').valid()) {
                $el.find('button').remove();
                $el.find('a.edit').show();
                var data = Utils.serializeForm($elDetails.find('.section-content'));
                $.extend(partner, data);
                console.log(partner.version);
                sync();
            }
        }

        function updateView() {
            $el.find('[data-src=legalName]').html(partner.legalName);
            $el.find('[data-src=businessName]').html(partner.businessName);
            $el.find('[data-src=fullName]').html(partner.fullName);
            $el.find('[data-src=organisationType]').html(partner.organisationType);
            $el.find('[data-src=employeeCount]').html(partner.employeeCount);
            $el.find('[data-src="address[street]"]').html(partner.address.street);
            $el.find('[data-src="address[number]"]').html(partner.address.number);
            if(partner.address.region !== undefined) {
                $el.find('[data-src="address[region]"]').html(partner.address.region);
            }
            $el.find('[data-src="address[city]"]').html(partner.address.city);
            $el.find('[data-src="address[postalCode]"]').html(partner.address.postalCode);
            $el.find('[data-src="address[country][countryName]"]')
                .html('<img src="../images/flags/'
                    + partner.address.country.countryCode +'.png" class="flags" alt="Drapeau">'
                    + partner.address.country.name);
            $el.find('[data-src="phoneNumber"]').html(partner.phoneNumber);
            $el.find('[data-src="email"]').html(
                '<a href="mailto: ' + partner.email + '">' + partner.email + '</a>');
            $el.find('[data-src="website"]').html('<a href="'
                + partner.website + '" target="_blank">' + partner.website + '</a>');
            if(app.isProfessor()) {
                if (partner.archived) {
                    $buttonArchivePartner.removeClass('btn-danger').addClass('btn-default');
                    $buttonArchivePartner.html('Réhabiliter le partenaire');
                } else {
                    $buttonArchivePartner.removeClass('btn-default').addClass('btn-danger');
                    $buttonArchivePartner.html('Archiver le partenaire');
                }
            }
        }

        function destroy() {
            $el.hide();
            partner = null;
            unbindAll();
            $el.find('[data-src]').html('');
        }

        function toggleArchivatePartner() {
            if(partner.archived === true){
                partner.archived = false;
            }else{
                partner.archived = true;
            }
            sync();
            updateView();
        }

        function sync() {
            $.ajax({
                method: 'PUT',
                url: app.API_URL + '/partners/' + partner.id,
                data: 'data=' + JSON.stringify(partner),
                success: function(data) {
                    partner.version = data.version;
                    partner.address.version = data.address.version;
                    updateView();
                },
                error: function(data) {
                    var error = data.responseJSON;
                    if(error !== undefined && error.errorCode === 120) {
                        console.log('concurrentModification');
                        PubSub.publish('concurrentModification');
                    }
                },
                500: function () {
                    PubSub.publish('serverError');
                }
            });
        }

        return {
            render: render,
            destroy: destroy
        }

    })();

    var StudentsView = (function () {

        // Private variables
        var title = 'Etudiants';
        var table;

        // DOM Cache
        var $el;
        var $table;

        function cacheDOM() {
            $el = $('#students-view');
            $table = $el.find('table');
        }

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            $table.on('click', 'tbody tr a.promote', promoteUser);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            $table.off('click', 'tbody tr a.promote', promoteUser);
        }

        function initializeTable() {
            table = $table.DataTable({
                serverSide: false,
                ajax: app.API_URL + '/users',
                autoWidth: false,
                dataSrc: '',
                order: [[ 1, 'desc' ]],
                bLengthChange: false,
                bInfo: false,
                oLanguage: dataTableStrings,
                aoColumns: [
                    {
                        mData: function(o, type) {
                            return o.option.code;
                        },
                        title: ''
                    },
                    {
                        mData: function (o, type) {
                            return o.lastName + ' ' + o.firstName;
                        },
                        mRender: function (data, type, raw) {
                            return raw.firstName + ' ' + raw.lastName;
                        },
                        title: 'Nom de l\'étudiant'
                    },
                    {
                        mData: function (o, type) {
                            return o.username;
                        },
                        title: 'Nom d\'utilisateur'
                    },
                    {
                        mRender: function (data, type, raw) {
                            return '<a href="mailto: ' + raw.email + '">' + raw.email +'</a>';
                        },
                        bSortable: false,
                        title: 'E-mail'
                    },
                    {
                        mRender: function (data, type, raw) {
                            return (raw.role === 'Professor') ? 'Professeur' : 'Etudiant';
                        },
                        title: 'Role'
                    },
                    {
                        mRender: function (data, type, raw) {
                            return (raw.role === 'Professor') ? '' : '<a href="#" class="promote">Promouvoir</a>';
                        },
                        bSortable: false,
                        title: 'Action'
                    }],
                fnCreatedRow: function(nRow, aData, iDataIndex ) {
                    $(nRow).attr({'data-id' : aData.id});
                }
            });
        }

        function updateTable() {
            table.ajax.reload();
        }

        function promoteUser() {
            var id = $(this).parent().parent().attr('data-id');
            $.ajax({
                url: app.API_URL + '/users/' + id + '/promote',
                method: 'PUT',
                success: function(resp) {
                    updateTable();
                }
            });
        }

        function render() {
            document.title = title + ' | ' + app.getAppName();
            NavigationBarView.render();
            if($el === undefined) {
                cacheDOM();
            }
            bindAll();
            if(!table) {
                initializeTable();
            } else {
                updateTable();
            }
            $el.show();
        }

        function destroy() {
            $el.hide();
            unbindAll();
        }

        return {
            render: render,
            destroy: destroy
        }

    })();

    var StudentDetailsView = (function() {

        // Private variables
        var title = 'Mes données personnelles';
        var isDisplayed;
        var edited; // is true if a field has been edited since view load
        var student;
        var isComplete;

        // DOM cache
        var $el;
        var $form;
        var $buttonSubmit;
        

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
            $form.on('submit', submitHandler);
            $form.find(':input').on('input', inputHandler);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
            $form.off('submit', submitHandler);
        }

        function cacheDOM() {
            $el = $('#student-personal-details-view');
            $form = $el.find('form');
            $buttonSubmit = $el.find('button');
        }

        function inputHandler() {
            // Enables save button as soon as one input has changed
            if(!edited) {
                $buttonSubmit.attr({'disabled': false});
                edited = true;
            }
        }

        function submitHandler(e) {
            e.preventDefault();
            var addressId = student.address.id;
            var addressVersion = student.address.version;
            var dataForm = Utils.serializeForm($form);
            $.extend(student, dataForm);
            /*var date = student.birthdate;
            var args = date.split('/');
            if(args[1].length === 1) {
                args[1] = '0' + args[1];
            }
            if(args[0].length === 1) {
                args[0] = '0' + args[0];
            }
            student.birthdate = args[2] + '-' + args[1] + '-' + args[0];*/
            student.birthdate = '1991-05-31';
            student.address.id = addressId;
            student.address.version = addressVersion;
            sync();
        }

        function fetch() {
            $.ajax({
                method: 'GET',
                url: app.API_URL + '/nominatedStudents/' + app.getUser().id,
                success: function(resp) {
                    student = resp;
                    isComplete = true;
                },
                error: function () {
                    student = app.getUser();
                },
                complete: function() {
                    console.log(student.version);
                    Utils.populateForm($form, student);
                    if(student.birthdate) {
                        var date = new Date(student.birthdate);
                        $form.find('[name=birthdate]').val(date.getUTCDate() + '/' + date.getUTCMonth() + '/' + date.getUTCFullYear());
                    }
                    $el.show();
                }
            });
        }

        function sync() {
            $.ajax({
                method: (isComplete) ? 'PUT' : 'POST',
                url: app.API_URL + '/nominatedStudents/' + ((isComplete) ? app.getUser().id : ''),
                data: 'data=' + JSON.stringify(student),
                success: function(resp) {
                    student.version = resp.version;
                    isComplete = true;
                    $el.find('.notification').show();
                }
            });
        }

        function render() {
            document.title = title + ' | ' + app.getAppName();
            NavigationBarView.render();
            if(!$el) {
                cacheDOM();
            }
            $.ajax({
                url: app.API_URL + '/countries',
                success: function (data) {
                    for(var i = 0; i < data.length; i++ ) {
                        $form.find('select[name="address[country][countryCode]"]')
                            .append('<option value="'
                            + data[i]['countryCode'] + '"' +
                                ((data[i]['countryCode'] === 'BE') ? 'selected' : '')
                                + '>' + data[i]['name'] + '</option>');
                        $form.find('select[name="nationality[countryCode]"]')
                            .append('<option value="'
                                + data[i]['countryCode'] + '"' +
                                ((data[i]['countryCode'] === 'BE') ? 'selected' : '')
                            + '>' + data[i]['name'] + '</option>');
                    }
                    fetch();
                }
            });
            bindAll();
        }

        function destroy() {
            $el.hide();
            unbindAll();
            $el.find('.notification').hide();
            edited = false;
        }

        return {
            render: render,
            destroy: destroy
        }

    })();

    var PaymentsView = (function () {

        var title = 'Paiements';
        var table;

        // Cache DOM
        var $el = $('#payments-view');
        var $table = $el.find('table');

        function bindAll() {
            PubSub.subscribe('destroy', destroy);
        }

        function unbindAll() {
            PubSub.unsubscribe('destroy', destroy);
        }

        function initializeTable() {
            table = $table.DataTable({
                serverSide: false,
                ajax: app.API_URL + '/payments',
                dataSrc: 'data',
                bLengthChange: false,
                bInfo: false,
                oLanguage: dataTableStrings,
                aoColumns: [
                    {
                        mData: function (o, type) {
                            return o.user.firstName + ' ' + o.user.lastName;
                        },
                        title: 'Etudiant'
                    },
                    {
                        mData: function (o, type) {
                            return o.partner.fullName;
                        },
                        title: 'Partenaire'
                    },
                    {
                        mData: function (o, type) {
                            return (o.mobilityType === 'SMS') ? 'Académique' : 'Stage';
                        },
                        title: 'Type'
                    },
                    {
                        mData: function (o, type) {
                            return o.programme.programmeName;
                        },
                        title: 'Programme'
                    },
                    {
                        mData: function (o, type) {
                            return (o.paymentType === 'D') ? 'Départ' : 'Arrivée';
                        },
                        title: 'Type paiement'
                    },
                    {
                        mData: function (o, type) {
                            var date = new Date(o.paymentDate);
                            return date.getUTCDate() + '/' + date.getUTCMonth() + '/' + date.getUTCFullYear();
                        },
                        title: 'Effectué le'
                    }]
            });
        }

        function render() {
            bindAll();
            document.title = title + ' | ' + app.getAppName();
            NavigationBarView.render();
            $el.show();
            if(!table) {
                initializeTable();
            } else {
                table.ajax.reload();
            }
        }

        function destroy() {
            $el.hide();
        }

        // Public API
        return {
            render: render,
            destroy: destroy
        }

    })();
    
    var ErrorView = (function() {

        // Private attributes

        // DOM Cache

        function cacheDOM() {

        }

        function bindAll() {

        }

        function unbindAll() {

        }

        function renderServerError() {

        }

        function destroy() {

        }

        return {

        }

    })();

    FunnyMode = (function () {

        var $body = $('body');

        function start() {
            $body.addClass('funny');
            var content = $body.html();
            $body.html('<marquee>' + content + '</marquee>')
        }
        
        function stop() {
            $body.removeClass('funny');
            var content = $body.find('marquee').html();
            $body.html(content);
        }

        return {
            start: start,
            stop: stop
        }

    })();

    // App entry point
    app = new App();
    app.start();

    // Initialize routes
    Router.add('/', function() {
        if (app.isProfessor()) {
            Router.navigate('/mobilites', true);
        } else if (app.isStudent()) {
            Router.navigate('/demandes-de-mobilite', true);
        } else {
            Router.navigate('/connexion', true);
        }
    })

    Router.add('/connexion', function() {
        if(app.isStudent() || app.isProfessor()) {
            Router.navigate('/');
        }
        SigninView.render();
    });

    Router.add('/inscription', function() {
        if(app.isStudent() || app.isProfessor()) {
            Router.navigate('/');
        }
        SignupView.render();
    });

    Router.add('/mes-donnees-personnelles', function() {
        StudentDetailsView.render();
    });

    Router.add('/demandes-de-mobilite', function() {
        MobilityChoicesView.render();
    });

    Router.add('/mobilites', function() {
        MobilitiesView.render();
    });

    Router.add('/partenaires', function() {
        PartnersView.render();
    });

    Router.add('/etudiants', function() {
        StudentsView.render();
    });

    Router.add('/paiements', function() {
        PaymentsView.render();
    });

    Router.add('/ajout-de-demande-de-mobilite', function() {
        CreateMobilityChoiceView.render();
    });

    Router.add('/demandes-de-mobilite', function() {
        MobilityChoicesView.render();
    });

    Router.add('/ajout-de-partenaire', function() {
        CreatePartnerView.render();
    });

})();
