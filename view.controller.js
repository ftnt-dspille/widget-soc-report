/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('socreport100DevCtrl', socreport100DevCtrl);

    socreport100DevCtrl.$inject = ['$scope', '$state', 'Entity', '$q', '$sce', 'toaster'];

    function socreport100DevCtrl($scope, $state, Entity, $q, $sce, toaster) {
        $scope.loading = true;
        $scope.error = null;
        $scope.deviceSummary = [];
        $scope.matchingRecords = [];
        $scope.totalDevices = 0;
        $scope.totalRevisions = 0;
        $scope.totalMatches = 0;
        $scope.changeNumber = '';

        // Get module and record ID from state params
        $scope.module = $state.params.module;
        $scope.recordId = $state.params.id;

        function loadRecordData() {
            if (!$scope.module || !$scope.recordId) {
                $scope.error = 'This widget can only be used on record detail pages.';
                $scope.loading = false;
                return;
            }

            if (!$scope.config.selectedField) {
                $scope.error = 'No field selected in widget configuration.';
                $scope.loading = false;
                return;
            }

            var entity = new Entity($scope.module);
            entity.get($scope.recordId, { $relationships: true }).then(function() {
                $scope.entity = entity;

                // Get the change number from the configured field
                if ($scope.config.changeNumberField) {
                    var changeNumberValue = $scope.entity.fields[$scope.config.changeNumberField];
                    if (changeNumberValue && changeNumberValue.value) {
                        $scope.changeNumber = changeNumberValue.value;
                    }
                }

                processReportData();
            }).catch(function(error) {
                $scope.error = 'Failed to load record data: ' + (error.message || 'Unknown error');
                $scope.loading = false;
            });
        }

        function processReportData() {
            try {
                var fieldValue = $scope.entity.fields[$scope.config.selectedField];

                if (!fieldValue || !fieldValue.value) {
                    $scope.error = 'No data found in the selected field.';
                    $scope.loading = false;
                    return;
                }

                var rawValue = fieldValue.value;
                var jsonData;

                // Parse JSON data
                if (typeof rawValue === 'string') {
                    jsonData = JSON.parse(rawValue);
                } else {
                    jsonData = rawValue;
                }

                // Process the new data structure
                processDeviceSummary(jsonData);
                processMatchingRecords(jsonData);

                $scope.loading = false;

            } catch (error) {
                $scope.error = 'Error processing report data: ' + error.message;
                $scope.loading = false;
            }
        }

        function processDeviceSummary(jsonData) {
            // Handle records_by_device data
            if (jsonData.records_by_device && Array.isArray(jsonData.records_by_device)) {
                $scope.deviceSummary = jsonData.records_by_device.map(function(device) {
                    return {
                        device: device.device,
                        total: device.total,
                        matches: 0 // Will be calculated from matching records
                    };
                });

                // Calculate total devices and revisions
                $scope.totalDevices = $scope.deviceSummary.length;
                $scope.totalRevisions = $scope.deviceSummary.reduce(function(sum, device) {
                    return sum + device.total;
                }, 0);
            }
        }

        function processMatchingRecords(jsonData) {
            // Handle records_matching_query data
            if (jsonData.records_matching_query && Array.isArray(jsonData.records_matching_query)) {
                $scope.matchingRecords = jsonData.records_matching_query.map(function(record) {
                    return {
                        id: record.id,
                        uuid: record.uuid,
                        device: record.device,
                        revisionID: record.revisionID,
                        comments: record.comments,
                        status: record.status ? record.status.itemValue : 'Unknown',
                        statusColor: getStatusColor(record.status ? record.status.itemValue : 'Unknown'),
                        extraInfo: record.extraInfo,
                        modifiedDate: formatDateTime(record.modifiedDate),
                        modifyingUser: record.modifyingUser,
                        installingUser: record.installingUser,
                        installTime: formatDateTime(record.installTime),
                        // Since records are pre-filtered, we know they contain the CHG
                        hasCHG: true,
                        // Extract CHG numbers from comments
                        chgNumbers: extractCHGNumbers(record.comments)
                    };
                });

                $scope.totalMatches = $scope.matchingRecords.length;

                // Update device summary with match counts
                updateDeviceMatchCounts();
            }
        }

        function updateDeviceMatchCounts() {
            // Count matches per device
            var matchCounts = {};
            $scope.matchingRecords.forEach(function(record) {
                if (!matchCounts[record.device]) {
                    matchCounts[record.device] = 0;
                }
                matchCounts[record.device]++;
            });

            // Update device summary with match counts
            $scope.deviceSummary.forEach(function(device) {
                device.matches = matchCounts[device.device] || 0;
            });
        }

        function extractCHGNumbers(text) {
            if (!text) return [];
            var matches = text.match(/CHG\d+/gi);
            return matches || [];
        }

        function formatDateTime(timestamp) {
            if (!timestamp) return 'N/A';

            try {
                // Handle both Unix timestamp and regular timestamp
                var date = new Date(timestamp * 1000); // Assume Unix timestamp
                if (isNaN(date.getTime())) {
                    date = new Date(timestamp); // Try regular timestamp
                }
                if (isNaN(date.getTime())) {
                    return timestamp.toString();
                }
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            } catch (e) {
                return timestamp.toString();
            }
        }

        function getStatusColor(status) {
            switch (status.toLowerCase()) {
                case 'installed': return 'success';
                case 'pending': return 'warning';
                case 'failed': return 'danger';
                case 'cancelled': return 'secondary';
                case 'active': return 'info';
                default: return 'info';
            }
        }

        // Get devices sorted by revision count
        $scope.getDevicesWithCounts = function() {
            return $scope.deviceSummary.sort(function(a, b) {
                return b.total - a.total; // Sort by revision count descending
            });
        };

        // Get matching records by device
        $scope.getMatchingRecordsByDevice = function(deviceName) {
            return $scope.matchingRecords.filter(function(record) {
                return record.device === deviceName;
            }).sort(function(a, b) {
                return b.revisionID - a.revisionID; // Sort by revision ID descending
            });
        };

        // Get all matching records sorted
        $scope.getAllMatchingRecords = function() {
            return $scope.matchingRecords.sort(function(a, b) {
                // First sort by device, then by revision ID
                if (a.device === b.device) {
                    return b.revisionID - a.revisionID;
                }
                return a.device.localeCompare(b.device);
            });
        };

        // Get unique CHG numbers from all matching records
        $scope.getAllCHGNumbers = function() {
            var allCHGs = [];
            $scope.matchingRecords.forEach(function(record) {
                allCHGs = allCHGs.concat(record.chgNumbers);
            });
            // Return unique CHG numbers
            return allCHGs.filter(function(chg, index, self) {
                return self.indexOf(chg) === index;
            });
        };

        // Highlight CHG numbers in text
        $scope.highlightCHG = function(text) {
            if (!text) return '';
            return $sce.trustAsHtml(text.replace(/CHG\d+/gi, '<span class="chg-highlight">$&</span>'));
        };

        // Refresh data
        $scope.refreshData = function() {
            $scope.loading = true;
            $scope.error = null;
            loadRecordData();
        };

        // Check if there's data to display
        $scope.hasData = function() {
            return $scope.deviceSummary.length > 0 || $scope.matchingRecords.length > 0;
        };

        function _init() {
            if (!$scope.config) {
                $scope.error = 'Widget configuration not found.';
                $scope.loading = false;
                return;
            }

            loadRecordData();
        }

        _init();
    }
})();