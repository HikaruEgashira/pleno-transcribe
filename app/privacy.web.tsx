"use client";

import { motion } from "framer-motion";
import { Mic, ArrowLeft, Lock, Eye, Database, Trash2, Mail, Github } from "lucide-react";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium text-foreground">{title}</h2>
      <div className="text-muted space-y-3">{children}</div>
    </section>
  );
}

function InfoCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-surface border border-border">
      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-background border border-border flex-shrink-0">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const lastUpdated = "2025年1月11日";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-foreground">
                Pleno Live
              </span>
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/HikaruEgashira/pleno-live"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-surface transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5 text-muted hover:text-foreground" />
              </a>
              <a
                href="/"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>ホームに戻る</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-12"
        >
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-3xl font-medium text-foreground">
              プライバシーポリシー
            </h1>
            <p className="text-muted">最終更新日: {lastUpdated}</p>
          </div>

          {/* Introduction */}
          <div className="rounded-xl border border-border bg-surface p-6">
            <p className="text-muted">
              Pleno
              Live（以下「本アプリ」）は、ユーザーのプライバシーを最優先に設計されています。
              本プライバシーポリシーでは、本アプリがどのようにデータを収集、使用、保護するかについて説明します。
            </p>
          </div>

          {/* Key Points */}
          <div className="grid gap-4 md:grid-cols-2">
            <InfoCard
              icon={Lock}
              title="端末内完結"
              description="録音データと文字起こしデータはすべて端末内に保存され、運営会社のサーバーへの送信は行いません。"
            />
            <InfoCard
              icon={Eye}
              title="透明性"
              description="収集するデータの種類と目的を明確に開示しています。"
            />
            <InfoCard
              icon={Database}
              title="最小限のデータ"
              description="機能の提供に必要な最小限のデータのみを収集します。"
            />
            <InfoCard
              icon={Trash2}
              title="完全な削除"
              description="アプリのアンインストール時にすべてのデータが削除されます。"
            />
          </div>

          {/* Sections */}
          <Section title="1. 収集するデータ">
            <p>
              本アプリは、ボイスメモおよび文字起こし機能を提供するため、以下のデータを収集します：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>音声データ:</strong>{" "}
                マイクから録音された音声データ（文字起こし処理のために使用）
              </li>
              <li>
                <strong>文字起こしテキスト:</strong>{" "}
                音声データから生成されたテキストデータ
              </li>
              <li>
                <strong>メモのメタデータ:</strong>{" "}
                作成日時、タイトル、タグなどの情報
              </li>
            </ul>
          </Section>

          <Section title="2. データの保存場所">
            <p>
              収集したすべてのデータは、ユーザーの端末内に保存されます。
              音声データおよび文字起こしデータは運営会社のサーバーに送信されることはありません。
            </p>
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 mt-4">
              <p className="text-green-800 dark:text-green-200 text-sm">
                <strong>重要:</strong>{" "}
                本アプリはプライバシーファーストで設計されています。
                録音データがインターネット経由で送信されることはありません。
              </p>
            </div>
          </Section>

          <Section title="3. 外部サービスへのデータ送信">
            <p>
              文字起こし機能を提供するため、音声データは以下の外部サービスに送信される場合があります：
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>ElevenLabs:</strong>{" "}
                音声認識（Speech-to-Text）サービスとして使用
              </li>
              <li>
                <strong>Google Gemini:</strong>{" "}
                要約やメモの整理などのAI機能に使用
              </li>
            </ul>
            <p className="mt-4">
              これらのサービスへのデータ送信は、ユーザーがアプリの設定でAPIキーを設定した場合にのみ行われます。
              各サービスのプライバシーポリシーについては、それぞれのサービス提供元をご確認ください。
            </p>
          </Section>

          <Section title="4. データの利用目的">
            <p>収集したデータは、以下の目的でのみ使用されます：</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>音声の録音および再生</li>
              <li>音声データの文字起こし</li>
              <li>メモの保存、管理、検索</li>
            </ul>
          </Section>

          <Section title="5. データの共有">
            <p>
              本アプリは、収集したデータを第三者と共有することはありません。
              すべてのデータはユーザーの端末内に留まります（3.
              に記載の外部サービスへの送信を除く）。
            </p>
          </Section>

          <Section title="6. データの保持期間">
            <p>
              データは、ユーザーが明示的に削除するか、アプリをアンインストールするまで保持されます。
              アプリ内の設定から、いつでもデータを削除することができます。
            </p>
          </Section>

          <Section title="7. ユーザーの権利">
            <p>ユーザーは以下の権利を有します：</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                <strong>アクセス権:</strong>{" "}
                アプリ内から保存されたすべてのメモを閲覧できます
              </li>
              <li>
                <strong>削除権:</strong> いつでもメモを削除できます
              </li>
              <li>
                <strong>オプトアウト:</strong>{" "}
                アプリをアンインストールすることで、データ収集を完全に停止できます
              </li>
            </ul>
          </Section>

          <Section title="8. プライバシーポリシーの変更">
            <p>
              本プライバシーポリシーは、必要に応じて更新されることがあります。
              重要な変更がある場合は、アプリ内で通知します。
            </p>
          </Section>

          <Section title="9. お問い合わせ">
            <p>
              プライバシーに関するご質問やご懸念がある場合は、以下の方法でお問い合わせください：
            </p>
            <div className="flex items-center gap-2 mt-4 p-4 rounded-lg bg-surface border border-border">
              <Mail className="h-5 w-5 text-muted" />
              <span>
                GitHubの
                <a
                  href="https://github.com/HikaruEgashira/pleno-live/issues"
                  className="text-primary hover:underline ml-1"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Issues
                </a>
                をご利用ください
              </span>
            </div>
          </Section>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-muted">
          © 2025 Pleno Live
        </div>
      </footer>
    </div>
  );
}
