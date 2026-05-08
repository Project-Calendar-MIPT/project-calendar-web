import React, { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { Card } from "../components/ui/Card";

type Status = "loading" | "success" | "error";

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Токен подтверждения отсутствует.");
      return;
    }

    apiClient
      .get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then((res) => {
        const { token: jwt } = res.data;
        if (jwt) {
          localStorage.setItem("auth_token", jwt);
          localStorage.removeItem("current_user");
        }
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err.response?.data?.message ||
            "Ссылка недействительна или уже была использована.",
        );
      });
  }, [searchParams]);

  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      navigate("/");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Card className="verify-email-card">
          {status === "loading" && <p>Подтверждаем email…</p>}

          {status === "success" && (
            <>
              <h1 style={{ marginBottom: "0.75rem" }}>Email подтверждён!</h1>
              <p>Аккаунт активирован. Входим в систему…</p>
              <p style={{ marginTop: "0.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
                Перенаправление через {countdown} сек.{" "}
                <Link to="/" onClick={() => navigate("/")}>Войти сейчас</Link>
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 style={{ marginBottom: "0.75rem" }}>Ошибка подтверждения</h1>
              <p>{message}</p>
              <div style={{ marginTop: "1.5rem" }}>
                <Link to="/register">Зарегистрироваться заново</Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
