# Idempotent Xcode project integration. No credentials or provisioning changes.
require 'xcodeproj'
project = Xcodeproj::Project.open(File.expand_path('../ios/App/App.xcodeproj', __dir__))
app = project.targets.find { |target| target.name == 'App' }
abort 'Missing App target' unless app
unless project.targets.any? { |target| target.name == 'BirthdayNotification' }
  target = project.new_target(:app_extension, 'BirthdayNotification', :ios, '15.0')
  group = project.main_group.new_group('BirthdayNotification', 'BirthdayNotification')
  target.source_build_phase.add_file_reference(group.new_file('NotificationViewController.swift'))
  group.new_file('Info.plist')
  target.build_configurations.each do |config|
    source = app.build_configurations.find { |item| item.name == config.name }.build_settings
    config.build_settings.merge!({
      'INFOPLIST_FILE' => 'BirthdayNotification/Info.plist',
      'PRODUCT_NAME' => '$(TARGET_NAME)',
      'PRODUCT_BUNDLE_IDENTIFIER' => source.fetch('PRODUCT_BUNDLE_IDENTIFIER') + '.BirthdayNotification',
      'DEVELOPMENT_TEAM' => source.fetch('DEVELOPMENT_TEAM'),
      'MARKETING_VERSION' => source.fetch('MARKETING_VERSION'),
      'CURRENT_PROJECT_VERSION' => source.fetch('CURRENT_PROJECT_VERSION'),
      'CODE_SIGN_STYLE' => 'Automatic',
      'SWIFT_VERSION' => '5.0',
      'APPLICATION_EXTENSION_API_ONLY' => 'YES',
      'SKIP_INSTALL' => 'YES',
      'TARGETED_DEVICE_FAMILY' => '1,2'
    })
  end
  app.add_dependency(target)
  embed = app.new_copy_files_build_phase('Embed App Extensions')
  embed.dst_subfolder_spec = '13'
  file = embed.add_file_reference(target.product_reference)
  file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  project.save
end
