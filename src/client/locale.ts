const keys = ['title', 'noSession', 'search', 'empty', 'loading', 'error', 'retry', 'clear', 'openFailed'] as const
export type Key = typeof keys[number]

function labels(...copy: [string, string, string, string, string, string, string, string, string]): Record<Key, string> {
  return {
    title: copy[0], noSession: copy[1], search: copy[2], empty: copy[3], loading: copy[4],
    error: copy[5], retry: copy[6], clear: copy[7], openFailed: copy[8],
  }
}

export const dictionaries = {
  en: labels('Workspace files', 'Open a workspace session to browse files.', 'Search files or paths', 'No entries', 'Loading…', 'Could not load files.', 'Retry', 'Clear search', 'A preview is unavailable for this file.'),
  zh: labels('工作区文件', '打开一个工作区会话即可浏览文件。', '搜索文件名或路径', '没有条目', '正在加载…', '无法加载文件。', '重试', '清空搜索', '此文件无法预览。'),
  ja: labels('ワークスペースのファイル', 'ファイルを閲覧するにはワークスペースのセッションを開いてください。', 'ファイル名またはパスを検索', '項目がありません', '読み込み中…', 'ファイルを読み込めませんでした。', '再試行', '検索を消去', 'このファイルはプレビューできません。'),
  de: labels('Arbeitsbereichsdateien', 'Öffnen Sie eine Sitzung im Arbeitsbereich, um Dateien zu durchsuchen.', 'Dateien oder Pfade suchen', 'Keine Einträge', 'Wird geladen…', 'Dateien konnten nicht geladen werden.', 'Erneut versuchen', 'Suche leeren', 'Für diese Datei ist keine Vorschau verfügbar.'),
  es: labels('Archivos del espacio de trabajo', 'Abre una sesión del espacio de trabajo para explorar archivos.', 'Buscar archivos o rutas', 'No hay elementos', 'Cargando…', 'No se pudieron cargar los archivos.', 'Reintentar', 'Borrar búsqueda', 'No hay vista previa para este archivo.'),
  fr: labels('Fichiers de l’espace de travail', 'Ouvrez une session de l’espace de travail pour parcourir les fichiers.', 'Rechercher des fichiers ou des chemins', 'Aucun élément', 'Chargement…', 'Impossible de charger les fichiers.', 'Réessayer', 'Effacer la recherche', 'Aucun aperçu pour ce fichier.'),
  pt: labels('Arquivos do espaço de trabalho', 'Abra uma sessão do espaço de trabalho para navegar pelos arquivos.', 'Pesquisar arquivos ou caminhos', 'Nenhum item', 'Carregando…', 'Não foi possível carregar os arquivos.', 'Tentar novamente', 'Limpar pesquisa', 'Não há prévia deste arquivo.'),
  ru: labels('Файлы рабочей области', 'Откройте сеанс рабочей области для просмотра файлов.', 'Поиск файлов или путей', 'Нет элементов', 'Загрузка…', 'Не удалось загрузить файлы.', 'Повторить', 'Очистить поиск', 'Предпросмотр этого файла недоступен.'),
}
