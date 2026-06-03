import { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:3000";

export default function AdminPanel({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [observationList, setObservationList] = useState([]);
  const [adminError, setAdminError] = useState("");

  useEffect(() => {
    if (!currentUser || currentUser.role !== "ADMIN") return;
    fetchAdminData();
  }, [currentUser]);

  async function fetchAdminData() {
    try {
      setAdminError("");

      const [logsResponse, observationResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/logs`, {
          headers: {
            "x-user-email": currentUser.email
          }
        }),
        fetch(`${API_BASE_URL}/admin/observation-list`, {
          headers: {
            "x-user-email": currentUser.email
          }
        })
      ]);

      const logsResult = await logsResponse.json();
      const observationResult = await observationResponse.json();

      if (!logsResponse.ok) {
        setAdminError(logsResult.error || "Could not load logs.");
        return;
      }

      if (!observationResponse.ok) {
        setAdminError(observationResult.error || "Could not load observation list.");
        return;
      }

      setLogs(logsResult);
      setObservationList(observationResult);
    } catch (error) {
      setAdminError("Could not connect to admin endpoints.");
    }
  }

  if (!currentUser || currentUser.role !== "ADMIN") {
    return null;
  }

  return (
    <section className="content-stack" style={{ marginTop: "24px" }}>
      <section className="card">
        <div className="section-header">
          <h2>Observation List</h2>
        </div>

        {adminError && (
          <p style={{ color: "red", marginBottom: "12px" }}>{adminError}</p>
        )}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Reason</th>
                <th>Incidents</th>
                <th>Last Incident</th>
              </tr>
            </thead>
            <tbody>
              {observationList.length > 0 ? (
                observationList.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.user?.name}</td>
                    <td>{entry.user?.email}</td>
                    <td>{entry.user?.role?.name}</td>
                    <td>{entry.reason}</td>
                    <td>{entry.incidentCount}</td>
                    <td>{new Date(entry.lastIncidentAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6">No suspicious users.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Action Logs</h2>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.user?.name}</td>
                    <td>{log.user?.email}</td>
                    <td>{log.groupId}</td>
                    <td>{log.actionInformation}</td>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">No logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}