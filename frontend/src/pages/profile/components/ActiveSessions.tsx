import { useState, useEffect } from 'react';
import { authService, type Session } from '@/services/authService';
import { toast } from 'sonner';
import { LogOut, Monitor, Globe, MapPin, Clock, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '@/pages/admin/components/modals';
import './ActiveSessions.css';

export function ActiveSessions() {
	const [sessions, setSessions] = useState<Session[]>([]);
	const [loading, setLoading] = useState(true);
	const [signingOutAll, setSigningOutAll] = useState(false);
	const [signingOutSession, setSigningOutSession] = useState<string | null>(null);
	const [showSignOutAllModal, setShowSignOutAllModal] = useState(false);

	useEffect(() => {
		fetchSessions();
	}, []);

	const fetchSessions = async () => {
		try {
			setLoading(true);
			const response = await authService.getActiveSessions();
			setSessions(response.sessions);
		} catch (error: any) {
			console.error('Failed to fetch sessions:', error);
			toast.error(error?.response?.data?.message || 'Không thể tải danh sách phiên đăng nhập');
		} finally {
			setLoading(false);
		}
	};

	const handleSignOutAll = async () => {
		try {
			setSigningOutAll(true);
			const response = await authService.signOutAllDevices();
			toast.success(response.message || `Đã đăng xuất ${response.deletedCount} thiết bị khác`);
			await fetchSessions();
		} catch (error: any) {
			console.error('Failed to sign out all devices:', error);
			toast.error(error?.response?.data?.message || 'Không thể đăng xuất tất cả thiết bị');
		} finally {
			setSigningOutAll(false);
			setShowSignOutAllModal(false);
		}
	};

	const handleSignOutSession = async (sessionId: string) => {
		try {
			setSigningOutSession(sessionId);
			const response = await authService.signOutSession(sessionId);
			toast.success(response.message || 'Đã đăng xuất thiết bị thành công');
			await fetchSessions();
		} catch (error: any) {
			console.error('Failed to sign out session:', error);
			toast.error(error?.response?.data?.message || 'Không thể đăng xuất thiết bị');
		} finally {
			setSigningOutSession(null);
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) {
			return 'Vừa xong';
		} else if (diffMins < 60) {
			return `${diffMins} phút trước`;
		} else if (diffHours < 24) {
			return `${diffHours} giờ trước`;
		} else if (diffDays < 7) {
			return `${diffDays} ngày trước`;
		} else {
			return date.toLocaleDateString('vi-VN', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			});
		}
	};

	if (loading) {
		return (
			<div className="active-sessions">
				<h2 className="form-title">Phiên đăng nhập</h2>
				<div className="sessions-loading">Đang tải...</div>
			</div>
		);
	}

	return (
		<div className="active-sessions">
			<div className="sessions-header">
				<h2 className="form-title">Phiên đăng nhập</h2>
				{sessions.length > 1 && (
					<button
						className="sign-out-all-button"
						onClick={() => setShowSignOutAllModal(true)}
						disabled={signingOutAll}
					>
						{signingOutAll ? 'Đang xử lý...' : 'Đăng xuất tất cả thiết bị khác'}
					</button>
				)}
			</div>

			<p className="sessions-description">
				Quản lý các thiết bị đã đăng nhập vào tài khoản của bạn. Bạn có thể đăng xuất bất kỳ thiết bị nào bất cứ lúc nào.
			</p>

			{sessions.length === 0 ? (
				<div className="sessions-empty">Không có phiên đăng nhập nào</div>
			) : (
				<div className="sessions-list">
					{sessions.map((session) => (
						<div
							key={session._id}
							className={`session-item ${session.isCurrentSession ? 'current-session' : ''}`}
						>
							<div className="session-icon">
								<Monitor size={20} />
							</div>
							<div className="session-info">
								<div className="session-header-info">
									<div className="session-device">
										{session.deviceName} • {session.browserName}
										{session.isCurrentSession && (
											<span className="current-badge">
												<CheckCircle2 size={14} />
												Thiết bị hiện tại
											</span>
										)}
									</div>
									{!session.isCurrentSession && (
										<button
											className="sign-out-session-button"
											onClick={() => handleSignOutSession(session._id)}
											disabled={signingOutSession === session._id}
											title="Đăng xuất thiết bị này"
										>
											{signingOutSession === session._id ? (
												'Đang xử lý...'
											) : (
												<>
													<LogOut size={14} />
													Đăng xuất
												</>
											)}
										</button>
									)}
								</div>
								<div className="session-details">
									<div className="session-detail-item">
										<Globe size={14} />
										<span>{session.ipAddress}</span>
									</div>
									<div className="session-detail-item">
										<MapPin size={14} />
										<span>{session.location}</span>
									</div>
									<div className="session-detail-item">
										<Clock size={14} />
										<span>Hoạt động lần cuối: {formatDate(session.lastActive)}</span>
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<ConfirmModal
				isOpen={showSignOutAllModal}
				onClose={() => setShowSignOutAllModal(false)}
				onConfirm={handleSignOutAll}
				title="Đăng xuất tất cả thiết bị khác"
				message={`Bạn có chắc chắn muốn đăng xuất tất cả thiết bị khác không? Bạn sẽ vẫn đăng nhập trên thiết bị hiện tại.`}
				confirmText="Đăng xuất tất cả"
				cancelText="Hủy"
				variant="warning"
			/>
		</div>
	);
}

