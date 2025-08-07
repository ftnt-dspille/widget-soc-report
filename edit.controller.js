/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editSocreport100Ctrl', editSocreport100Ctrl);

    editSocreport100Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'Field', 'Entity', '$state', 'toaster', '$timeout'];

    function editSocreport100Ctrl($scope, $uibModalInstance, config, Field, Entity, $state, toaster, $timeout) {
        $scope.cancel = cancel;
        $scope.save = save;
        $scope.config = config;
        $scope.loadFields = loadFields;
        $scope.page = $state.params.page;


        // Initialize config defaults
        if (!$scope.config.title) {
            $scope.config.title = 'HTML Report';
        }
        if (!$scope.config.selectedField) {
            $scope.config.selectedField = '';
        }
        if (!$scope.config.changeNumberField) {
            $scope.config.changeNumberField = '';
        }

        $scope.fields = [];
        $scope.changeNumberFields = [];
        $scope.currentModule = $state.params.module;

        console.log('EditSocreport100DevCtrl initialized');
        console.log('Current module from $state.params:', $scope.currentModule);
        console.log('Full $state.params:', $state.params);

        function loadFields() {
            console.log('loadFields() called with module:', $scope.currentModule);

            if (!$scope.currentModule) {
                console.error('No current module available');
                toaster.warning({
                    body: 'No module detected. This widget must be configured from a record detail page.'
                });
                return;
            }

            console.log('Creating Entity for module:', $scope.currentModule);
            var entity = new Entity($scope.currentModule);

            entity.loadFields().then(function () {
                console.log('Entity fields loaded successfully');

                // Get all fields
                var formFields = entity.getFormFields();
                console.log('Form fields retrieved:', formFields);
                console.log('Number of form fields:', Object.keys(formFields).length);

                // Reset fields array
                $scope.fields = [];
                var validFieldCount = 0;

                angular.forEach(formFields, function (field, fieldName) {
                    console.log('Processing field:', fieldName, 'Type:', field.type, 'Field object:', field);

                    // Only include text and textarea fields as requested
                    if (field.type === 'text' || field.type === 'textarea') {
                        $scope.fields.push({
                            name: fieldName,
                            title: field.title || fieldName,
                            type: field.type
                        });
                        validFieldCount++;
                        console.log('Added valid field:', fieldName, 'type:', field.type);
                    }
                    if (field.type === 'text' || field.type === 'textarea' || field.type === 'string') {
                        $scope.changeNumberFields.push({
                            name: fieldName,
                            title: field.title || fieldName,
                            type: field.type
                        });
                    }
                });

                console.log('Total valid fields added to dropdown:', $scope.fields.length);
                console.log('Valid field types found:', validFieldCount);
                console.log('Fields for dropdown:', $scope.fields);

                // Sort fields alphabetically by title
                $scope.fields.sort(function (a, b) {
                    return a.title.localeCompare(b.title);
                });

                $scope.changeNumberFields.sort(function (a, b) {
                    return a.title.localeCompare(b.title);
                });

                // Use $timeout instead of $apply to avoid digest cycle conflicts
                if (!$scope.$phase && !$scope.$root.$phase) {
                    $scope.$apply();
                } else {
                    console.log('Digest cycle already in progress, skipping $apply');
                }

                toaster.success({
                    body: 'Loaded ' + $scope.fields.length + ' text/textarea fields from module ' + $scope.currentModule
                });

            }).catch(function (error) {
                console.error('Error loading entity fields:', error);

                // Use $timeout for error handling too
                if (!$scope.$phase && !$scope.$root.$phase) {
                    $scope.$apply();
                }

                toaster.error({
                    body: 'Failed to load fields: ' + (error.message || error)
                });
            });
        }

        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }

        function save() {
            if ($scope.editSocreportForm.$invalid) {
                $scope.editSocreportForm.$setTouched();
                $scope.editSocreportForm.$focusOnFirstError();
                return;
            }
            if (!$scope.config.changeNumberField) {
                toaster.error({
                    body: 'Please select a field containing the change number.'
                });
                return;
            }
            $uibModalInstance.close($scope.config);
        }

        function _init() {
            $timeout(function () {
                loadFields();
            }, 100);
        }

        _init();
    }
})();