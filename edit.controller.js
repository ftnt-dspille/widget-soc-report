/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editSocreport100Ctrl', editSocreport100Ctrl);

    editSocreport100Ctrl.$inject = ['$scope', '$uibModalInstance', 'config', 'Field', 'Entity', '$state', 'toaster', '$timeout', 'appModulesService'];

    function editSocreport100Ctrl($scope, $uibModalInstance, config, Field, Entity, $state, toaster, $timeout, appModulesService) {
        $scope.cancel = cancel;
        $scope.save = save;
        $scope.config = config;
        $scope.loadFields = loadFields;
        $scope.loadModules = loadModules;
        $scope.onModuleChange = onModuleChange;

        // Debug variables
        $scope.debugInfo = {
            currentModule: null,
            totalFields: 0,
            validFields: 0,
            entityLoaded: false,
            error: null,
            widgetContext: null
        };

        // Initialize config defaults
        if (!$scope.config.title) {
            $scope.config.title = 'SOC Report';
        }
        if (!$scope.config.selectedField) {
            $scope.config.selectedField = '';
        }
        if (!$scope.config.changeNumberField) {
            $scope.config.changeNumberField = '';
        }
        if (!$scope.config.module) {
            $scope.config.module = '';
        }
        if (!$scope.config.usageMode) {
            $scope.config.usageMode = 'auto'; // auto, detail, query
        }

        $scope.fields = [];
        $scope.changeNumberFields = [];
        $scope.modules = [];
        $scope.currentModule = $state.params.module;
        $scope.debugInfo.currentModule = $scope.currentModule;

        // Determine widget context
        $scope.isViewPanel = $state.current && $state.current.name.indexOf('viewPanel') !== -1;
        $scope.isDashboard = $state.current && $state.current.name.indexOf('dashboard') !== -1;
        $scope.isReporting = $state.current && $state.current.name.indexOf('reporting') !== -1;

        if ($scope.isViewPanel) {
            $scope.debugInfo.widgetContext = 'View Panel (Record Detail)';
        } else if ($scope.isDashboard) {
            $scope.debugInfo.widgetContext = 'Dashboard';
        } else if ($scope.isReporting) {
            $scope.debugInfo.widgetContext = 'Reporting';
        } else {
            $scope.debugInfo.widgetContext = 'Unknown';
        }

        console.log('EditSocreport100Ctrl initialized');
        console.log('Widget context:', $scope.debugInfo.widgetContext);
        console.log('Current module from $state.params:', $scope.currentModule);
        console.log('Full $state.params:', $state.params);

        function loadModules() {
            console.log('Loading modules...');
            appModulesService.load(true).then(function (modules) {
                $scope.modules = modules.filter(function(module) {
                    // Filter out system modules and only show user modules
                    return module.type && !module.system;
                }).sort(function(a, b) {
                    return a.name.localeCompare(b.name);
                });

                console.log('Loaded modules:', $scope.modules.length);

                // If we're on a view panel and have a current module, set it as default
                if ($scope.isViewPanel && $scope.currentModule && !$scope.config.module) {
                    $scope.config.module = $scope.currentModule;
                    $scope.config.usageMode = 'detail';
                }

                // If module is already selected, load its fields
                if ($scope.config.module) {
                    loadFields();
                }
            }).catch(function(error) {
                console.error('Error loading modules:', error);
                toaster.error({
                    body: 'Failed to load modules: ' + (error.message || error)
                });
            });
        }

        function onModuleChange() {
            if ($scope.config.module) {
                // Reset field selections when module changes
                $scope.config.selectedField = '';
                $scope.config.changeNumberField = '';
                $scope.fields = [];
                $scope.changeNumberFields = [];

                loadFields();
            }
        }

        function loadFields() {
            var moduleToLoad = $scope.config.module || $scope.currentModule;

            console.log('loadFields() called with module:', moduleToLoad);

            if (!moduleToLoad) {
                $scope.debugInfo.error = 'No module available for loading fields';
                console.error('No module available for loading fields');
                toaster.warning({
                    body: 'Please select a module first.'
                });
                return;
            }

            console.log('Creating Entity for module:', moduleToLoad);
            var entity = new Entity(moduleToLoad);

            entity.loadFields().then(function () {
                console.log('Entity fields loaded successfully');
                $scope.debugInfo.entityLoaded = true;

                // Get all fields
                var formFields = entity.getFormFields();
                console.log('Form fields retrieved:', formFields);
                console.log('Number of form fields:', Object.keys(formFields).length);
                $scope.debugInfo.totalFields = Object.keys(formFields).length;

                // Reset fields array
                $scope.fields = [];
                $scope.changeNumberFields = [];
                var validFieldCount = 0;

                angular.forEach(formFields, function (field, fieldName) {
                    console.log('Processing field:', fieldName, 'Type:', field.type, 'Field object:', field);

                    // Include text, textarea, and object fields for data source
                    if (field.type === 'text' || field.type === 'textarea' || field.type === 'object') {
                        $scope.fields.push({
                            name: fieldName,
                            title: field.title || fieldName,
                            type: field.type
                        });
                        validFieldCount++;
                        console.log('Added valid field:', fieldName, 'type:', field.type);
                    }

                    // Include text, textarea, and string fields for change number
                    if (field.type === 'text' || field.type === 'textarea' || field.type === 'string') {
                        $scope.changeNumberFields.push({
                            name: fieldName,
                            title: field.title || fieldName,
                            type: field.type
                        });
                    }
                });

                $scope.debugInfo.validFields = validFieldCount;
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
                    body: 'Loaded ' + $scope.fields.length + ' compatible fields from module ' + moduleToLoad
                });

            }).catch(function (error) {
                console.error('Error loading entity fields:', error);
                $scope.debugInfo.error = 'Failed to load fields: ' + (error.message || error);

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

            // Validate required fields based on usage mode
            if (!$scope.config.selectedField) {
                toaster.error({
                    body: 'Please select a data source field.'
                });
                return;
            }

            if (!$scope.config.changeNumberField) {
                toaster.error({
                    body: 'Please select a field containing the change number.'
                });
                return;
            }

            // For dashboard/report usage, module selection is required
            if (!$scope.isViewPanel && !$scope.config.module) {
                toaster.error({
                    body: 'Please select a module for dashboard/report usage.'
                });
                return;
            }

            // For dashboard/report usage, query configuration is required
            if (!$scope.isViewPanel && (!$scope.config.query || !$scope.config.query.filters || $scope.config.query.filters.length === 0)) {
                toaster.error({
                    body: 'Please configure query filters to identify the record for dashboard/report usage.'
                });
                return;
            }

            // Set usage mode based on context if not manually set
            if ($scope.config.usageMode === 'auto') {
                $scope.config.usageMode = $scope.isViewPanel ? 'detail' : 'query';
            }

            $uibModalInstance.close($scope.config);
        }

        function _init() {
            $timeout(function () {
                loadModules();
            }, 100);
        }

        _init();
    }
})();