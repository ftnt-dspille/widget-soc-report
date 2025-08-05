/* Copyright start
  MIT License
  Copyright (c) 2024 Fortinet Inc
  Copyright end */
'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('socreport100Ctrl', socreport100Ctrl);

    socreport100Ctrl.$inject = ['$scope', '$state', 'Entity', '$q', '$sce', 'toaster', '_'];

    function socreport100Ctrl($scope, $state, Entity, $q, $sce, toaster, _) {
        $scope.loading = true;
        $scope.error = null;
        $scope.reportData = null;
        $scope.filteredDevices = [];
        $scope.totalDevices = 0;
        $scope.totalMatchingRevisions = 0;
        $scope.executionTime = '';
        $scope.status = '';
        $scope.searchChangeNumber = '';

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
                $scope.error = 'No JSON data source field selected in widget configuration.';
                $scope.loading = false;
                return;
            }

            if (!$scope.config.changeNumberField) {
                $scope.error = 'No change number field selected in widget configuration.';
                $scope.loading = false;
                return;
            }

            var entity = new Entity($scope.module);
            entity.get($scope.recordId, { $relationships: true }).then(function () {
                $scope.entity = entity;
                processReportData();
            }).catch(function (error) {
                $scope.error = 'Failed to load record data: ' + (error.message || 'Unknown error');
                $scope.loading = false;
            });
        }

        function processReportData() {
            try {
                // Get the JSON data from the selected field
                var jsonFieldValue = $scope.entity.fields[$scope.config.selectedField];
                if (!jsonFieldValue || !jsonFieldValue.value) {
                    $scope.error = 'No data found in the selected JSON data field.';
                    $scope.loading = false;
                    return;
                }

                // Get the change number from the selected field
                var changeNumberFieldValue = $scope.entity.fields[$scope.config.changeNumberField];
                if (!changeNumberFieldValue || !changeNumberFieldValue.value) {
                    $scope.error = 'No change number found in the selected change number field.';
                    $scope.loading = false;
                    return;
                }

                var rawJsonValue = jsonFieldValue.value;
                var jsonData;

                // Parse JSON data
                if (typeof rawJsonValue === 'string') {
                    jsonData = JSON.parse(rawJsonValue);
                } else {
                    jsonData = rawJsonValue;
                }

                // Get the change number to search for
                $scope.searchChangeNumber = changeNumberFieldValue.value.trim();
                console.log('Searching for change number:', $scope.searchChangeNumber);

                // Extract report data based on JSON structure
                $scope.reportData = jsonData;
                $scope.executionTime = jsonData.execution_time || 'N/A';
                $scope.status = jsonData.status || 'Unknown';

                if (jsonData.result && Array.isArray(jsonData.result)) {
                    processDeviceData(jsonData.result);
                } else {
                    $scope.error = 'Invalid data format. Expected result array in JSON data.';
                    $scope.loading = false;
                    return;
                }

                $scope.loading = false;

            } catch (error) {
                $scope.error = 'Error processing report data: ' + error.message;
                $scope.loading = false;
            }
        }

        function processDeviceData(devices) {
            $scope.totalDevices = devices.length;
            $scope.filteredDevices = [];
            $scope.totalMatchingRevisions = 0;

            var showOnlyMatching = $scope.config.showOnlyMatching !== false; // Default to true
            var caseSensitive = $scope.config.caseSensitive === true; // Default to false

            devices.forEach(function (deviceEntry) {
                var device = deviceEntry.data;
                var processedDevice = {
                    name: device.device,
                    revisions: [], // This will now only contain matching revisions
                    hasMatchingRevisions: false,
                    totalRevisions: device.revisions ? device.revisions.length : 0,
                    matchingRevisionsCount: 0
                };

                if (device.revisions && Array.isArray(device.revisions)) {
                    device.revisions.forEach(function (revision) {
                        // Check if comments contain the specific change number
                        var hasMatchingChange = false;

                        if (revision.comments) {
                            var comments = caseSensitive ? revision.comments : revision.comments.toLowerCase();
                            var searchTerm = caseSensitive ? $scope.searchChangeNumber : $scope.searchChangeNumber.toLowerCase();

                            if (comments.indexOf(searchTerm) !== -1) {
                                hasMatchingChange = true;
                            }
                        }

                        // ONLY ADD REVISION IF IT MATCHES
                        if (hasMatchingChange) {
                            var processedRevision = angular.copy(revision);
                            processedRevision.hasMatchingChange = true;
                            processedRevision.matchingChangeNumber = $scope.searchChangeNumber;

                            // Format dates for display
                            processedRevision.formattedInsTime = formatDateTime(revision.instime);
                            processedRevision.formattedModTime = formatDateTime(revision.modtime);

                            // Get status badge class
                            processedRevision.statusClass = getStatusBadgeClass(revision.status);
                            processedRevision.statusText = getStatusText(revision.status);

                            processedDevice.revisions.push(processedRevision);
                            processedDevice.hasMatchingRevisions = true;
                            processedDevice.matchingRevisionsCount++;
                            $scope.totalMatchingRevisions++;
                        }
                    });

                    // Sort revisions by revision number descending
                    processedDevice.revisions.sort(function (a, b) {
                        return b.revision - a.revision;
                    });
                }

                // Only add device if it has matching revisions
                if (processedDevice.hasMatchingRevisions) {
                    $scope.filteredDevices.push(processedDevice);
                }
            });

            // Sort devices by name
            $scope.filteredDevices.sort(function (a, b) {
                return a.name.localeCompare(b.name);
            });

            console.log('Processed devices with matching revisions:', $scope.filteredDevices.length);
            console.log('Total matching revisions:', $scope.totalMatchingRevisions);
        }

        function formatDateTime(dateTimeStr) {
            if (!dateTimeStr) return 'N/A';
            try {
                var date = new Date(dateTimeStr.replace(' ', 'T'));
                return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            } catch (e) {
                return dateTimeStr;
            }
        }

        function getStatusBadgeClass(status) {
            switch (parseInt(status)) {
                case 4: return 'status-success';
                case 10: return 'status-warning';
                case 15: return 'status-info';
                default: return 'status-default';
            }
        }

        function getStatusText(status) {
            switch (parseInt(status)) {
                case 4: return 'Installed';
                case 10: return 'Pending';
                case 15: return 'Auto Updated';
                default: return 'Status ' + status;
            }
        }

        // Refresh data
        $scope.refreshData = function () {
            $scope.loading = true;
            $scope.error = null;
            loadRecordData();
        };

        // Toggle showing all devices vs. only matching
        $scope.toggleShowAll = function () {
            if ($scope.reportData && $scope.reportData.result) {
                processDeviceData($scope.reportData.result);
            }
        };

        // Get summary statistics
        $scope.getSummaryStats = function () {
            return {
                totalDevices: $scope.totalDevices,
                displayedDevices: $scope.filteredDevices.length,
                matchingRevisions: $scope.totalMatchingRevisions,
                searchChangeNumber: $scope.searchChangeNumber
            };
        };
        // PDF Export function
        $scope.exportToPDF = function () {
            try {
                // Create a new window with the report content
                var printWindow = window.open('', '_blank', 'width=800,height=600');

                // Generate HTML content for PDF
                var htmlContent = generatePDFContent();

                printWindow.document.write(htmlContent);
                printWindow.document.close();

                // Wait for content to load then print
                printWindow.onload = function () {
                    setTimeout(function () {
                        printWindow.print();
                        printWindow.close();
                    }, 500);
                };

            } catch (error) {
                toaster.error({
                    body: 'Failed to export PDF: ' + error.message
                });
            }
        };

        // Generate HTML content for PDF
        function generatePDFContent() {
            var stats = $scope.getSummaryStats();
            var currentDate = new Date().toLocaleDateString();
            var currentTime = new Date().toLocaleTimeString();

            var html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Device Installation Report - ${$scope.searchChangeNumber}</title>
        <style>
            body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                font-size: 12px; 
                line-height: 1.4;
            }
            .header { 
                border-bottom: 2px solid #333; 
                padding-bottom: 10px; 
                margin-bottom: 20px; 
            }
            .title { 
                font-size: 18px; 
                font-weight: bold; 
                margin: 0; 
            }
            .subtitle { 
                color: #666; 
                margin: 5px 0; 
            }
            .stats { 
                display: flex; 
                justify-content: space-around; 
                margin: 20px 0; 
                text-align: center; 
            }
            .stat-item { 
                border: 1px solid #ddd; 
                padding: 10px; 
                margin: 0 5px; 
                border-radius: 4px; 
            }
            .stat-number { 
                font-size: 16px; 
                font-weight: bold; 
                color: #333; 
            }
            .stat-label { 
                font-size: 10px; 
                color: #666; 
                text-transform: uppercase; 
            }
            .device { 
                border: 1px solid #ddd; 
                margin: 15px 0; 
                border-radius: 4px; 
                page-break-inside: avoid; 
            }
            .device-header { 
                background: #f8f9fa; 
                padding: 10px; 
                border-bottom: 1px solid #ddd; 
                font-weight: bold; 
            }
            .revision { 
                padding: 10px; 
                border-bottom: 1px solid #eee; 
            }
            .revision:last-child { 
                border-bottom: none; 
            }
            .revision-header { 
                display: flex; 
                justify-content: space-between; 
                font-weight: bold; 
                margin-bottom: 5px; 
            }
            .status-badge { 
                padding: 2px 6px; 
                border-radius: 3px; 
                font-size: 10px; 
                text-transform: uppercase; 
            }
            .status-success { 
                background: #d4edda; 
                color: #155724; 
            }
            .status-warning { 
                background: #fff3cd; 
                color: #856404; 
            }
            .status-info { 
                background: #d1ecf1; 
                color: #0c5460; 
            }
            .comments { 
                background: #f8f9fa; 
                padding: 8px; 
                margin: 5px 0; 
                border-left: 3px solid #007bff; 
                font-style: italic; 
            }
            .details { 
                display: grid; 
                grid-template-columns: 1fr 1fr 1fr; 
                gap: 10px; 
                margin-top: 10px; 
                font-size: 11px; 
            }
            .detail-item { 
                border: 1px solid #eee; 
                padding: 5px; 
                border-radius: 2px; 
            }
            .detail-label { 
                font-weight: bold; 
                font-size: 9px; 
                color: #666; 
                text-transform: uppercase; 
            }
            .footer { 
                margin-top: 30px; 
                padding-top: 10px; 
                border-top: 1px solid #ddd; 
                font-size: 10px; 
                color: #666; 
            }
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="title">${$scope.config.title || 'Device Installation Report'}</h1>
            <div class="subtitle">
                Change Number: <strong>${$scope.searchChangeNumber}</strong> | 
                Generated: ${currentDate} ${currentTime}
            </div>
            <div class="subtitle">
                Execution Time: ${$scope.executionTime} | 
                Status: ${$scope.status}
            </div>
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-number">${stats.totalDevices}</div>
                <div class="stat-label">Total Devices</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.displayedDevices}</div>
                <div class="stat-label">Matching Devices</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.matchingRevisions}</div>
                <div class="stat-label">Matching Revisions</div>
            </div>
        </div>
    `;

            // Add device data
            $scope.filteredDevices.forEach(function (device) {
                html += `
        <div class="device">
            <div class="device-header">
                ${device.name} (${device.revisions.length} matching revision${device.revisions.length !== 1 ? 's' : ''})
            </div>
        `;

                device.revisions.forEach(function (revision) {
                    var statusClass = 'status-' + (revision.statusClass || 'default').replace('status-', '');

                    html += `
            <div class="revision">
                <div class="revision-header">
                    <span>Revision ${revision.revision}</span>
                    <span class="status-badge ${statusClass}">${revision.statusText}</span>
                </div>
                ${revision.comments ? `<div class="comments">${revision.comments}</div>` : ''}
                <div class="details">
                    <div class="detail-item">
                        <div class="detail-label">Install User</div>
                        <div>${revision.instusr || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Install Time</div>
                        <div>${revision.formattedInsTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Modified By</div>
                        <div>${revision.modusr || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Modified Time</div>
                        <div>${revision.formattedModTime}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Tag</div>
                        <div>${revision.tag || 'None'}</div>
                    </div>
                    ${revision.extra_info ? `
                    <div class="detail-item">
                        <div class="detail-label">Extra Info</div>
                        <div>${revision.extra_info}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            `;
                });

                html += '</div>';
            });

            // Add footer
            html += `
        <div class="footer">
            Report generated from FortiSOAR | ${currentDate} ${currentTime}
        </div>
    </body>
    </html>
    `;

            return html;
        }

        function _init() {
            if (!$scope.config) {
                $scope.error = 'Widget configuration not found.';
                $scope.loading = false;
                return;
            }

            // Set default configuration values
            if ($scope.config.showOnlyMatching === undefined) {
                $scope.config.showOnlyMatching = true;
            }

            loadRecordData();
        }

        _init();
    }
})();