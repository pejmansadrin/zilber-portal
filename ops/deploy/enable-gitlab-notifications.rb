# Run with gitlab-rails runner in the GitLab container, as an administrator.
users = User.active.to_a.reject(&:bot?)
projects = Project.all.to_a
backup = {settings: NotificationSetting.all.map(&:attributes), users: users.map{|u|{id:u.id,notified_of_own_activity:u.notified_of_own_activity}},integrations:projects.flat_map{|p|p.integrations.where(type:['Integrations::EmailsOnPush','Integrations::PipelinesEmail']).map{|i|{project_id:p.id,attributes:i.attributes}}}}
File.write('/tmp/portal-notifications-before.json',JSON.pretty_generate(backup)) unless File.exist?('/tmp/portal-notifications-before.json')
File.chmod(0600,'/tmp/portal-notifications-before.json')
recipients = users.map{|u|u.notification_email.presence || u.email}.uniq
users.each do |user|
  user.update!(notified_of_own_activity: true)
  settings = user.notification_settings.to_a
  settings << user.notification_settings.build(source:nil) unless settings.any?{|s|s.source_id.nil?}
  settings.each do |setting|
    fields = NotificationSetting.email_events(setting.source).select{|event|setting.has_attribute?(event)}.to_h{|event|[event,true]}
    setting.update!(fields.merge(level: :custom))
  end
end
projects.each do |project|
  push = Integrations::EmailsOnPush.find_or_initialize_by(project:project)
  push.assign_attributes(active:true,push_events:true,tag_push_events:true,recipients:recipients.join(' '),branches_to_be_notified:'all',send_from_committer_email:false,disable_diffs:true)
  push.save!
  pipeline = Integrations::PipelinesEmail.find_or_initialize_by(project:project)
  pipeline.assign_attributes(active:true,pipeline_events:true,recipients:recipients.join(','),notify_only_broken_pipelines:false,notify_only_when_pipeline_status_changes:false,branches_to_be_notified:'all',notify_child_pipelines:true)
  pipeline.save!
  puts "Project #{project.full_path}: push/tag/pipeline email integrations enabled for #{recipients.size} users"
end
puts "Custom notifications and own-activity notifications enabled for #{users.size} active human users"
exit unless ENV['PORTAL_NOTIFICATION_TEST'] == '1'
accepted=0
recipients.each do |email|
  begin
    Notify.test_email(email,'GitLab notifications enabled — Zilber Portal CI/CD','Push, version tag, issue, merge request, release, and pipeline notifications have been enabled. Zilber Portal production: https://portal.zilber.tech').deliver_now
    accepted+=1
    puts "SMTP accepted notification test for recipient #{accepted}"
  rescue StandardError => error
    puts "SMTP test failed: #{error.class}"
  end
end
puts "SMTP accepted=#{accepted}, failed=#{recipients.size-accepted}"
raise 'Some SMTP tests failed' unless accepted == recipients.size
