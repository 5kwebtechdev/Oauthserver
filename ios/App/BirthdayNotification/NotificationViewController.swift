import UIKit
import UserNotifications
import UserNotificationsUI

final class NotificationViewController: UIViewController, UNNotificationContentExtension {
    private let stack = UIStackView()
    private let titleLabel = UILabel()
    private let messageLabel = UILabel()
    private let openButton = UIButton(type: .system)

    override func loadView() {
        view = UIView()
        view.backgroundColor = UIColor(red: 1, green: 253/255, blue: 249/255, alpha: 1)
        view.layer.cornerRadius = 24
        view.layer.borderWidth = 2
        view.layer.borderColor = UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1).cgColor
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = .preferredFont(forTextStyle: .headline)
        messageLabel.font = .preferredFont(forTextStyle: .subheadline)
        titleLabel.textColor = UIColor(red: 15/255, green: 23/255, blue: 42/255, alpha: 1)
        messageLabel.textColor = UIColor(red: 89/255, green: 85/255, blue: 104/255, alpha: 1)
        for label in [titleLabel, messageLabel] {
            label.numberOfLines = 0
            label.adjustsFontForContentSizeCategory = true
            stack.addArrangedSubview(label)
        }
        openButton.setTitle("See What's Inside", for: .normal)
        openButton.tintColor = UIColor(red: 217/255, green: 119/255, blue: 6/255, alpha: 1)
        openButton.addTarget(self, action: #selector(openNotification), for: .touchUpInside)
        stack.addArrangedSubview(openButton)
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            stack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -16)
        ])
    }

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content
        let type = content.userInfo["type"] as? String
        titleLabel.text = content.title
        messageLabel.text = content.body
        openButton.isHidden = type != "BIRTHDAY_SELF" || content.categoryIdentifier != type
        view.setNeedsLayout()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let size = stack.systemLayoutSizeFitting(
            CGSize(width: max(1, view.bounds.width - 32), height: UIView.layoutFittingCompressedSize.height),
            withHorizontalFittingPriority: .required, verticalFittingPriority: .fittingSizeLevel)
        let height = size.height + 32
        if abs(preferredContentSize.height - height) > 1 {
            preferredContentSize = CGSize(width: view.bounds.width, height: height)
        }
    }

    @objc private func openNotification() {
        // Forwards the original notification to the existing Firebase tap handler.
        extensionContext?.performNotificationDefaultAction()
    }
}
